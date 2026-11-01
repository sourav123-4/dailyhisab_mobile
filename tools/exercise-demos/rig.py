"""Anatomical figure rig + equipment, emitted as SDF primitives for render.c."""
import math
import numpy as np

DEG = math.pi / 180


def rx(a):
    c, s = math.cos(a * DEG), math.sin(a * DEG)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def ry(a):
    c, s = math.cos(a * DEG), math.sin(a * DEG)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rz(a):
    c, s = math.cos(a * DEG), math.sin(a * DEG)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def euler(yaw=0.0, pitch=0.0, roll=0.0):
    return ry(yaw) @ rx(pitch) @ rz(roll)


def nrm(v):
    v = np.asarray(v, dtype=float)
    return v / np.linalg.norm(v)


def lerp(a, b, t):
    return np.asarray(a, dtype=float) * (1 - t) + np.asarray(b, dtype=float) * t


def basis(y_axis, z_hint):
    """Right-handed frame with exact Y and Z as close to z_hint as possible."""
    y = nrm(y_axis)
    z = np.asarray(z_hint, dtype=float)
    z = z - y * np.dot(z, y)
    if np.linalg.norm(z) < 1e-6:
        z = np.cross(y, [1, 0, 0])
        if np.linalg.norm(z) < 1e-6:
            z = np.cross(y, [0, 0, 1])
    z = nrm(z)
    x = np.cross(y, z)
    return np.column_stack([x, y, z])


ROUNDCONE, ELLIPSOID, CYLINDER, BOX = 0, 1, 2, 3
MAT = dict(skin=0, target=1, secondary=2, shorts=3, hair=4, dark=5, steel=10, rubber=11, pad=12, frame=13, cable=14,
           stack=15, accent=16, mat=17)


class Scene:
    def __init__(self):
        self.prims = []

    def _add(self, typ, mat, k, a=(0, 0, 0), b=(0, 0, 0), ra=0.0, rb=0.0, R=np.eye(3), s=(0, 0, 0), rnd=0.0, tex=0):
        R = np.asarray(R, dtype=float)
        rows = R.T  # world -> local
        self.prims.append([typ, mat, k, *np.asarray(a, float), *np.asarray(b, float), ra, rb, *rows[0], *rows[1], *rows[2],
                           *np.asarray(s, float), rnd, float(tex)])

    def cone(self, a, b, ra, rb, mat, k=0.0):
        self._add(ROUNDCONE, mat, k, a=a, b=b, ra=ra, rb=rb)

    def ell(self, center, R, radii, mat, k=0.0, tex=0):
        """tex=1 marks a muscle belly: the renderer draws fibres along its local Y axis."""
        self._add(ELLIPSOID, mat, k, a=center, R=R, s=radii, tex=tex)

    def cyl(self, a, b, r, mat, rnd=0.004, k=0.0):
        self._add(CYLINDER, mat, k, a=a, b=b, ra=r, rb=r, rnd=rnd)

    def box(self, center, R, half, mat, rnd=0.01, k=0.0):
        self._add(BOX, mat, k, a=center, R=R, s=half, rnd=rnd)

    def serialize(self):
        lines = [f"F {len(self.prims)}"]
        for p in self.prims:
            lines.append(" ".join(f"{v:.5f}" if isinstance(v, float) else str(v) for v in
                                  [int(p[0]), int(p[1])] + [float(x) for x in p[2:]]))
        return "\n".join(lines)


# ---------------------------------------------------------------- rig

L_UA, L_FA, L_TH, L_SH = 0.285, 0.255, 0.44, 0.425


def two_bone(root, target, l1, l2, pole):
    root = np.asarray(root, float)
    target = np.asarray(target, float)
    d = target - root
    dist = np.linalg.norm(d)
    dn = d / dist
    dist = min(max(dist, abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4)
    a = (l1 * l1 + dist * dist - l2 * l2) / (2 * dist)
    h = math.sqrt(max(l1 * l1 - a * a, 0.0))
    p = np.asarray(pole, float)
    p = p - dn * np.dot(p, dn)
    if np.linalg.norm(p) < 1e-6:
        p = np.cross(dn, [1, 0, 0])
    p = nrm(p)
    mid = root + dn * a + p * h
    end = root + dn * dist
    return mid, end, p


class Rig:
    def __init__(self):
        self.pelvis_pos = np.array([0, 0.97, 0.0])
        self.pelvis_R = np.eye(3)
        self.spine_rot = np.eye(3)
        self.chest_rot = np.eye(3)
        self.neck_rot = rx(6)
        self.arms = {}
        self.legs = {}
        self._solve_torso()

    # -- torso
    def set_pelvis(self, pos, yaw=0, pitch=0, roll=0):
        self.pelvis_pos = np.asarray(pos, float)
        self.pelvis_R = euler(yaw, pitch, roll)
        self._solve_torso()

    def set_spine(self, flex=0, twist=0, side=0, chest_flex=None, chest_twist=None, neck_flex=0, neck_twist=0):
        self.spine_rot = ry(twist) @ rx(flex) @ rz(side)
        cf = flex * 0.8 if chest_flex is None else chest_flex
        ct = twist if chest_twist is None else chest_twist
        self.chest_rot = ry(ct) @ rx(cf) @ rz(side * 0.6)
        self.neck_rot = ry(neck_twist) @ rx(6 + neck_flex)
        self._solve_torso()

    def _solve_torso(self):
        P = self.pelvis_R
        self.lumbar = self.pelvis_pos + P @ [0, 0.08, 0]
        self.abd_R = P @ self.spine_rot
        self.chest_o = self.lumbar + self.abd_R @ [0, 0.20, 0]
        self.chest_R = self.abd_R @ self.chest_rot
        self.neck_o = self.chest_o + self.chest_R @ [0, 0.285, -0.01]
        self.head_R = self.chest_R @ self.neck_rot
        self.head_o = self.neck_o + self.head_R @ [0, 0.085, 0.01]

    def shoulder(self, side):
        return self.chest_o + self.chest_R @ [side * 0.182, 0.232, -0.01]

    def hip(self, side):
        return self.pelvis_pos + self.pelvis_R @ [side * 0.09, -0.025, 0.0]

    def chest_point(self, local):
        return self.chest_o + self.chest_R @ np.asarray(local, float)

    def pelvis_point(self, local):
        return self.pelvis_pos + self.pelvis_R @ np.asarray(local, float)

    def head_point(self, local):
        return self.head_o + self.head_R @ np.asarray(local, float)

    def body_dir(self, local):
        return self.chest_R @ np.asarray(local, float)

    # -- limbs
    def arm(self, side, wrist, pole, pron=0.0, wrist_flex=0.0):
        S = self.shoulder(side)
        E, W, p = two_bone(S, wrist, L_UA, L_FA, pole)
        u = nrm(E - S)
        f = nrm(W - E)
        bend = f - u * np.dot(f, u)
        z = nrm(bend) if np.linalg.norm(bend) > 1e-4 else -p
        ua_R = basis(S - E, z)
        x = ua_R[:, 0]
        y_f = nrm(E - W)
        fa_R = np.column_stack([x, y_f, np.cross(x, y_f)])
        hand_R = fa_R @ ry(-side * pron) @ rx(-wrist_flex)
        self.arms[side] = dict(S=S, E=E, W=W, ua=ua_R, fa=fa_R, hand=hand_R)

    def arm_fk(self, side, elev, azim, elbow, twist=0.0, pron=0.0, wrist_flex=0.0):
        """Arm by angles in the chest frame: elev from hanging (0) to overhead (180); azim 0 = to the side,
        90 = forward. The forearm bends by `elbow` degrees in the plane chosen by `twist` (0 = forward)."""
        S = self.shoulder(side)
        e, a = elev * DEG, azim * DEG
        d_local = np.array([side * math.sin(e) * math.cos(a), -math.cos(e), math.sin(e) * math.sin(a)])
        u = self.chest_R @ d_local
        # bend plane: rotate "forward" about u by twist
        fwd = self.chest_R @ np.array([0, 0, 1.0])
        if abs(np.dot(fwd, u)) > 0.95:
            fwd = self.chest_R @ np.array([0, -math.copysign(1, np.dot(fwd, u)), 0])
        b = nrm(fwd - u * np.dot(fwd, u))
        if twist:
            k = u
            t = twist * DEG * side
            b = b * math.cos(t) + np.cross(k, b) * math.sin(t) + k * np.dot(k, b) * (1 - math.cos(t))
        E = S + u * L_UA
        ang = elbow * DEG
        f = u * math.cos(ang) + b * math.sin(ang)
        W = E + f * L_FA
        pole = E - (S + W) / 2 if elbow > 3 else -b
        self.arm(side, W, pole, pron=pron, wrist_flex=wrist_flex)

    def leg(self, side, ankle, pole, toe_dir=(0, 0, 1), foot_up=(0, 1, 0)):
        H = self.hip(side)
        K, A, p = two_bone(H, ankle, L_TH, L_SH, pole)
        u = nrm(K - H)
        f = nrm(A - K)
        bend = f - u * np.dot(f, u)
        z = -nrm(bend) if np.linalg.norm(bend) > 1e-4 else p
        th_R = basis(H - K, z)
        x = th_R[:, 0]
        y_s = nrm(K - A)
        sh_R = np.column_stack([x, y_s, np.cross(x, y_s)])
        ft_R = basis(foot_up, toe_dir)
        self.legs[side] = dict(H=H, K=K, A=A, th=th_R, sh=sh_R, ft=ft_R)

    def leg_fk(self, side, hip_flex, knee, abd=0.0, toe_out=8.0, ankle_flex=None):
        """Leg by angles relative to the pelvis."""
        H = self.hip(side)
        P = self.pelvis_R
        th_dir = P @ (rz(side * abd) @ rx(-hip_flex) @ np.array([0, -1.0, 0]))
        K = H + th_dir * L_TH
        fwd = P @ (rz(side * abd) @ rx(-hip_flex) @ np.array([0, 0, 1.0]))
        sh_dir = th_dir * math.cos(knee * DEG) - fwd * math.sin(knee * DEG)
        A = K + sh_dir * L_SH
        shin_fwd = fwd * math.cos(knee * DEG) + th_dir * math.sin(knee * DEG)
        af = 90 - 0 if ankle_flex is None else ankle_flex
        toe = shin_fwd * math.cos((af - 90) * DEG) + sh_dir * math.sin((af - 90) * DEG)
        toe = ry(side * toe_out) @ toe if abs(toe[1]) < 0.9 else toe
        self.leg(side, A, fwd, toe_dir=toe, foot_up=-sh_dir if ankle_flex is None else np.cross(toe, np.cross(-sh_dir, toe)))

    def grip(self, side, along=0.0):
        a = self.arms[side]
        return a["W"] + a["hand"] @ np.array([0, -0.062, 0.012])

    # -- emit
    def build(self, sc: Scene, targets=(), secondary=()):
        def m(tag, default=MAT["skin"]):
            if tag in targets:
                return MAT["target"]
            if tag in secondary:
                return MAT["secondary"]
            return default

        skin = MAT["skin"]
        P, A, C, Hd = self.pelvis_R, self.abd_R, self.chest_R, self.head_R

        def at(o, R, local):
            return o + R @ np.asarray(local, float)

        # pelvis & shorts
        sc.ell(at(self.pelvis_pos, P, [0, 0.0, -0.005]), P, [0.152, 0.112, 0.102], MAT["shorts"], 0.0)
        for s in (-1, 1):
            sc.ell(at(self.pelvis_pos, P, [s * 0.07, -0.035, -0.06]), P, [0.078, 0.092, 0.066], m("glutes", MAT["shorts"]), 0.015, tex=1)
        sc.ell(at(self.pelvis_pos, P, [0, 0.075, 0.012]), P, [0.125, 0.075, 0.08], skin, 0.03)

        # abdomen
        sc.ell(at(self.lumbar, A, [0, 0.085, 0]), A, [0.126, 0.13, 0.088], skin, 0.035)
        for row, y in enumerate((0.03, 0.09, 0.15)):
            for s in (-1, 1):
                sc.ell(at(self.lumbar, A, [s * 0.031, y, 0.072 + 0.004 * row]), A, [0.03, 0.03, 0.019], m("abs"), 0.016, tex=1)
        for s in (-1, 1):
            sc.ell(at(self.lumbar, A, [s * 0.098, 0.065, 0.025]), A @ rz(s * 8), [0.034, 0.085, 0.055], m("obliques"), 0.02, tex=1)
            sc.ell(at(self.lumbar, A, [s * 0.036, 0.09, -0.07]), A, [0.03, 0.13, 0.026], m("erectors"), 0.015, tex=1)

        # chest / back
        sc.ell(at(self.chest_o, C, [0, 0.105, -0.008]), C, [0.148, 0.16, 0.104], skin, 0.035)
        sc.ell(at(self.chest_o, C, [0, 0.205, -0.015]), C, [0.185, 0.075, 0.09], skin, 0.03)
        for s in (-1, 1):
            sc.ell(at(self.chest_o, C, [s * 0.078, 0.178, 0.066]), C @ rz(-s * 18) @ rx(10), [0.098, 0.06, 0.034], m("pecs"), 0.016, tex=1)
            sc.ell(at(self.chest_o, C, [s * 0.075, 0.262, -0.035]), C @ rz(-s * 22), [0.08, 0.045, 0.05], m("traps"), 0.02, tex=1)
            sc.ell(at(self.chest_o, C, [s * 0.112, 0.07, -0.05]), C @ rz(s * 14), [0.052, 0.14, 0.068], m("lats"), 0.02, tex=1)
            sc.ell(at(self.chest_o, C, [s * 0.05, 0.155, -0.094]), C, [0.045, 0.072, 0.026], m("midback", m("traps")), 0.016, tex=1)

        # neck & head
        sc.cone(self.chest_point([0, 0.24, -0.012]), self.neck_o + Hd @ [0, 0.06, 0.0], 0.056, 0.048, skin, 0.03)
        ho = self.head_o
        sc.ell(at(ho, Hd, [0, 0.095, 0.006]), Hd, [0.082, 0.106, 0.094], skin, 0.02)
        sc.ell(at(ho, Hd, [0, 0.028, 0.036]), Hd, [0.06, 0.05, 0.064], skin, 0.03)
        sc.ell(at(ho, Hd, [0, 0.072, 0.099]), Hd @ rx(-12), [0.012, 0.024, 0.017], skin, 0.01)
        sc.ell(at(ho, Hd, [0, 0.038, 0.086]), Hd, [0.018, 0.0035, 0.006], MAT["dark"], 0.0)
        for s in (-1, 1):
            sc.ell(at(ho, Hd, [s * 0.082, 0.08, -0.004]), Hd, [0.012, 0.027, 0.018], skin, 0.008)
            sc.ell(at(ho, Hd, [s * 0.029, 0.092, 0.084]), Hd, [0.009, 0.004, 0.006], MAT["dark"], 0.0)
            sc.ell(at(ho, Hd, [s * 0.03, 0.103, 0.088]), Hd @ rz(-s * 8), [0.017, 0.0035, 0.005], MAT["hair"], 0.0)
        sc.ell(at(ho, Hd, [0, 0.132, -0.013]), Hd, [0.087, 0.083, 0.094], MAT["hair"], 0.0)

        # arms
        for s, a in self.arms.items():
            S, E, W, U, F, Hn = a["S"], a["E"], a["W"], a["ua"], a["fa"], a["hand"]

            def ual(lat, y, fr):
                return S + U @ [s * lat, y, fr]

            sc.cone(S, E, 0.05, 0.038, skin, 0.025)
            sc.ell(ual(0.004, -0.03, 0.034), U, [0.048, 0.08, 0.046], m("delts_front"), 0.02, tex=1)
            sc.ell(ual(0.034, -0.042, 0.0), U, [0.046, 0.085, 0.052], m("delts_side"), 0.02, tex=1)
            sc.ell(ual(0.004, -0.032, -0.034), U, [0.048, 0.078, 0.046], m("delts_rear"), 0.02, tex=1)
            sc.ell(ual(0, -0.155, 0.026), U, [0.041, 0.088, 0.043], m("biceps"), 0.015, tex=1)
            sc.ell(ual(0, -0.135, -0.027), U, [0.045, 0.105, 0.041], m("triceps"), 0.015, tex=1)

            sc.cone(E, W, 0.04, 0.026, skin, 0.02)
            sc.ell(E + F @ [s * 0.012, -0.075, 0.01], F, [0.039, 0.085, 0.037], m("forearms"), 0.015, tex=1)
            sc.ell(W + Hn @ [0, -0.052, 0.008], Hn, [0.04, 0.05, 0.026], skin, 0.015)
            sc.ell(W + Hn @ [s * 0.036, -0.03, 0.022], Hn @ rz(s * 20), [0.012, 0.03, 0.013], skin, 0.01)

        # legs
        for s, g in self.legs.items():
            H, K, Aa, T, Sh, Ft = g["H"], g["K"], g["A"], g["th"], g["sh"], g["ft"]

            def thl(lat, y, fr):
                return H + T @ [s * lat, y, fr]

            sc.cone(H, K, 0.088, 0.055, skin, 0.03)
            sc.ell(thl(0, -0.21, 0.044), T, [0.054, 0.16, 0.048], m("quads"), 0.015, tex=1)
            sc.ell(thl(0.05, -0.22, 0.01), T, [0.048, 0.16, 0.052], m("quads"), 0.015, tex=1)
            sc.ell(thl(-0.036, -0.33, 0.03), T, [0.045, 0.08, 0.045], m("quads"), 0.015, tex=1)
            sc.ell(thl(0, -0.22, -0.046), T, [0.06, 0.16, 0.048], m("hamstrings"), 0.015, tex=1)
            sc.ell(thl(-0.042, -0.12, 0.0), T, [0.04, 0.11, 0.05], skin, 0.02)
            sc.cone(H + T @ [0, 0.02, -0.004], H + T @ [0, -0.1, 0.0], 0.104, 0.1, MAT["shorts"], 0.004)
            sc.ell(thl(0, -0.425, 0.03), T, [0.028, 0.03, 0.018], skin, 0.02)

            sc.cone(K, Aa, 0.054, 0.032, skin, 0.02)
            sc.ell(K + Sh @ [-s * 0.03, -0.12, -0.032], Sh, [0.042, 0.095, 0.046], m("calves"), 0.015, tex=1)
            sc.ell(K + Sh @ [s * 0.03, -0.11, -0.028], Sh, [0.038, 0.09, 0.042], m("calves"), 0.015, tex=1)
            sc.ell(K + Sh @ [s * 0.02, -0.12, 0.024], Sh, [0.021, 0.09, 0.021], skin, 0.012)
            sc.ell(Aa + Ft @ [0, -0.048, 0.052], Ft, [0.042, 0.033, 0.122], skin, 0.02)


# ---------------------------------------------------------------- equipment

def barbell(sc, center, axis, plate_r=0.2, plates=2, length=1.9):
    c = np.asarray(center, float)
    ax = nrm(axis)
    h = length / 2
    sc.cyl(c - ax * h * 0.7, c + ax * h * 0.7, 0.0135, MAT["steel"], 0.002)
    for s in (-1, 1):
        sc.cyl(c + ax * s * (h * 0.7 - 0.02), c + ax * s * h, 0.024, MAT["steel"], 0.004)
        sc.cyl(c + ax * s * (h * 0.7 - 0.03), c + ax * s * (h * 0.7 - 0.005), 0.036, MAT["steel"], 0.005)
        x0 = h * 0.7
        for i in range(plates):
            r = plate_r if i == 0 else plate_r * 0.78
            sc.cyl(c + ax * s * (x0 + 0.002), c + ax * s * (x0 + 0.042), r, MAT["rubber"], 0.008)
            sc.cyl(c + ax * s * (x0 - 0.001), c + ax * s * (x0 + 0.045), 0.04, MAT["steel"], 0.004)
            x0 += 0.046


def dumbbell(sc, center, axis, head_r=0.052, handle=0.13, head_len=0.075):
    c = np.asarray(center, float)
    ax = nrm(axis)
    sc.cyl(c - ax * (handle / 2 + 0.01), c + ax * (handle / 2 + 0.01), 0.0155, MAT["steel"], 0.003)
    for s in (-1, 1):
        a = c + ax * s * (handle / 2)
        b = c + ax * s * (handle / 2 + head_len)
        sc.cyl(a, b, head_r, MAT["rubber"], 0.01)
        sc.cyl(b - ax * s * 0.004, b + ax * s * 0.004, head_r * 0.45, MAT["steel"], 0.003)


def flat_bench(sc, center, yaw=0.0, length=1.15, height=0.44, incline=0.0, seat_len=0.42):
    """Pad along local Z (head end at +Z when incline > 0 the back pad tilts up at the +Z end)."""
    R = ry(yaw)
    c = np.asarray(center, float)
    pad_t = 0.04
    if incline <= 0:
        sc.box(c + R @ [0, height, 0], R, [0.15, pad_t, length / 2], MAT["pad"], 0.025)
    else:
        seat_c = c + R @ [0, height, -0.05]
        sc.box(seat_c, R, [0.16, pad_t, seat_len / 2], MAT["pad"], 0.025)
        back_len = length - seat_len
        piv = c + R @ [0, height, -0.05 + seat_len / 2 + 0.02]
        Rb = R @ rx(-incline)
        sc.box(piv + Rb @ [0, 0.02, back_len / 2], Rb, [0.15, pad_t, back_len / 2], MAT["pad"], 0.025)
        sup = piv + Rb @ [0, -0.03, back_len * 0.45]
        sc.cone(sup, np.array([sup[0], 0.04, sup[2]]) + R @ [0, 0, 0.15], 0.025, 0.025, MAT["frame"])
    # frame
    sc.box(c + R @ [0, height - 0.07, -0.05], R, [0.04, 0.025, length / 2 - 0.1], MAT["frame"], 0.01)
    for z in (-length / 2 + 0.12, length / 2 - 0.15):
        sc.box(c + R @ [0, (height - 0.07) / 2, z], R, [0.03, (height - 0.07) / 2, 0.03], MAT["frame"], 0.008)
        sc.box(c + R @ [0, 0.02, z], R, [0.22, 0.02, 0.035], MAT["frame"], 0.008)


def cable_tower(sc, base, facing_yaw, pulley_h, handle_point, width=0.36):
    """Upright with a weight stack; the cable runs from a pulley at `pulley_h` to `handle_point`."""
    R = ry(facing_yaw)
    b = np.asarray(base, float)
    for s in (-1, 1):
        sc.box(b + R @ [s * width / 2, 1.05, 0], R, [0.035, 1.05, 0.035], MAT["frame"], 0.008)
    sc.box(b + R @ [0, 2.12, 0], R, [width / 2 + 0.05, 0.03, 0.06], MAT["frame"], 0.01)
    sc.box(b + R @ [0, 0.03, 0], R, [width / 2 + 0.12, 0.03, 0.3], MAT["frame"], 0.01)
    stack_h = 0.5 + 0.0
    sc.box(b + R @ [0, 0.12 + stack_h / 2, -0.02], R, [width / 2 - 0.06, stack_h / 2, 0.06], MAT["stack"], 0.008)
    for y in np.arange(0.17, 0.12 + stack_h, 0.05):
        sc.box(b + R @ [0, y, 0.045], R, [width / 2 - 0.065, 0.002, 0.004], MAT["frame"], 0.001)
    pul = b + R @ [0, pulley_h, 0.09]
    sc.cyl(pul + R @ [-0.02, 0, 0], pul + R @ [0.02, 0, 0], 0.045, MAT["frame"], 0.006)
    sc.box(b + R @ [0, pulley_h, 0.05], R, [0.03, 0.05, 0.05], MAT["frame"], 0.006)
    h = np.asarray(handle_point, float)
    sc.cyl(pul, h, 0.006, MAT["cable"], 0.002)
    return pul


def pullup_bar(sc, center_x=0.0, height=2.25, z=0.0, half=0.75):
    sc.cyl([center_x - half, height, z], [center_x + half, height, z], 0.017, MAT["steel"], 0.003)
    for s in (-1, 1):
        sc.box([center_x + s * (half + 0.03), height / 2 + 0.03, z], np.eye(3), [0.035, height / 2 + 0.03, 0.035], MAT["frame"], 0.008)
        sc.box([center_x + s * (half + 0.03), 0.025, z], np.eye(3), [0.05, 0.025, 0.45], MAT["frame"], 0.008)
