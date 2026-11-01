"""Per-exercise motion scripts. Each fn(phase) -> Scene, phase 0 = start position, 1 = peak contraction."""
import math

import numpy as np

from rig import (MAT, Rig, Scene, barbell, cable_tower, dumbbell, flat_bench, lerp, nrm, pullup_bar, rx, ry, rz)

EXERCISES = {}


def exercise(ex_id, cam, targets, secondary=(), timing=None):
    def deco(fn):
        def run(ph):
            sc = Scene()
            rig = fn(ph, sc)
            rig.build(sc, targets, secondary)
            return sc

        EXERCISES[ex_id] = dict(fn=run, cam=cam, timing=timing or (0.35, 1.1, 0.35, 1.35))
        return fn

    return deco


def stand(rig, width=0.12, toe_out=10, pelvis_y=0.97, pelvis_z=0.0, pitch=0.0, knee_fwd=0.0, feet_z=0.0):
    rig.set_pelvis([0, pelvis_y, pelvis_z], pitch=pitch)
    for s in (-1, 1):
        ankle = np.array([s * width, 0.085, feet_z])
        toe = ry(s * toe_out) @ np.array([0, 0, 1.0])
        rig.leg(s, ankle, [s * 0.15, 0, 1.0 + knee_fwd], toe_dir=toe)


def plain_stand(rig, **kw):
    stand(rig, **kw)


# ------------------------------------------------------------------ arms

@exercise("arms_barbell_curl", dict(target=[0, 0.93, 0], yaw=30, pitch=5, dist=3.25), ["biceps"], ["forearms"])
def barbell_curl(ph, sc):
    rig = Rig()
    stand(rig)
    rig.set_spine(flex=-2 * ph)
    for s in (-1, 1):
        rig.arm_fk(s, elev=6 + 12 * ph, azim=80, elbow=12 + 130 * ph, pron=-5)
    gl, gr = rig.grip(-1), rig.grip(1)
    barbell(sc, (gl + gr) / 2, gr - gl, plate_r=0.15, length=1.5)
    return rig


@exercise("legs_barbell_squat", dict(target=[0, 0.88, 0], yaw=40, pitch=6, dist=3.35), ["quads", "glutes"], ["hamstrings"])
def squat(ph, sc):
    rig = Rig()
    depth = ph
    pel_y = 0.97 - 0.43 * depth
    pel_z = -0.22 * depth
    rig.set_pelvis([0, pel_y, pel_z], pitch=38 * depth)
    rig.set_spine(flex=-6 * depth, chest_flex=-4 * depth, neck_flex=-25 * depth)
    for s in (-1, 1):
        ankle = np.array([s * 0.16, 0.085, 0.0])
        rig.leg(s, ankle, [s * 0.35, 0, 1.0], toe_dir=ry(s * 18) @ np.array([0, 0, 1.0]))
    bar = rig.chest_point([0, 0.275, -0.075])
    axis = rig.body_dir([1, 0, 0])
    for s in (-1, 1):
        w = bar + axis * s * 0.36 + rig.body_dir([0, -0.02, 0.06])
        rig.arm(s, w, rig.body_dir([s * 0.2, -1, -0.4]), pron=80)
    barbell(sc, bar, axis)
    return rig


# ------------------------------------------------------------------ helpers

from rig import DEG, L_FA, L_UA, L_SH, L_TH  # noqa: E402

ARM = L_UA + L_FA


def arm_plane(rig, s, u, b, elbow, pron=0.0, wrist_flex=0.0):
    """Upper arm along world direction u; forearm bends `elbow` degrees toward world direction b."""
    S = rig.shoulder(s)
    u = nrm(u)
    b = np.asarray(b, float)
    b = nrm(b - u * np.dot(b, u))
    E = S + u * L_UA
    a = elbow * DEG
    f = u * math.cos(a) + b * math.sin(a)
    W = E + f * L_FA
    pole = E - (S + W) / 2 if elbow > 3 else -b
    rig.arm(s, W, pole, pron=pron, wrist_flex=wrist_flex)


def hang_arm(rig, s, min_z=None, pron=80.0, out=0.0):
    """Arm hanging straight down from the shoulder (pushed forward to clear the thighs if needed)."""
    S = rig.shoulder(s)
    reach = ARM - 0.004
    dz = 0.0 if min_z is None else max(0.0, min_z - S[2])
    dz = min(dz, reach * 0.8)
    W = S + np.array([s * out, -math.sqrt(reach * reach - dz * dz - out * out), dz])
    rig.arm(s, W, np.array([s * 0.2, 0, -1.0]), pron=pron)


def straight_leg(rig, s, d, toe, up, pole=(0, 0, 1)):
    H = rig.hip(s)
    rig.leg(s, H + nrm(d) * (L_TH + L_SH - 0.003), pole, toe_dir=toe, foot_up=up)


def handle_bar(sc, a, b, r=0.014):
    sc.cyl(a, b, r, MAT["steel"], 0.003)


def seat_box(sc, center, half, mat=MAT["pad"], R=np.eye(3), rnd=0.025):
    sc.box(center, R, half, mat, rnd)


def floor_post(sc, top, half=0.03):
    top = np.asarray(top, float)
    sc.box([top[0], top[1] / 2, top[2]], np.eye(3), [half, top[1] / 2, half], MAT["frame"], 0.006)


def grips_mid(rig):
    gl, gr = rig.grip(-1), rig.grip(1)
    return (gl + gr) / 2, gr - gl


# ------------------------------------------------------------------ arms (cont.)

@exercise("arms_dumbbell_hammer_curl", dict(target=[0, 0.93, 0], yaw=28, pitch=5, dist=3.25), ["forearms", "biceps"])
def hammer_curl(ph, sc):
    rig = Rig()
    stand(rig)
    for s in (-1, 1):
        rig.arm_fk(s, elev=5 + 10 * ph, azim=85, elbow=10 + 125 * ph, pron=88)
        dumbbell(sc, rig.grip(s), rig.arms[s]["hand"][:, 0])
    return rig


@exercise("arms_incline_dumbbell_curl", dict(target=[0, 0.75, 0.05], yaw=62, pitch=8, dist=3.1), ["biceps"], ["forearms"])
def incline_curl(ph, sc):
    rig = Rig()
    flat_bench(sc, [0, 0, 0], yaw=180, incline=58, length=1.25)
    rig.set_pelvis([0, 0.6, -0.02], pitch=-30)
    rig.set_spine(flex=0, neck_flex=12)
    for s in (-1, 1):
        rig.leg(s, np.array([s * 0.2, 0.085, 0.5]), [s * 0.3, 0.3, 1.0], toe_dir=ry(s * 12) @ np.array([0, 0, 1.0]))
        arm_plane(rig, s, [s * 0.08, -1, -0.12], [0, 0, 1], 8 + 122 * ph, pron=-5)
        dumbbell(sc, rig.grip(s), rig.arms[s]["hand"][:, 0])
    return rig


def lying_on_bench(rig, sc, pelvis_z=0.28, feet_z=0.78):
    flat_bench(sc, [0, 0, -0.12], length=1.25)
    rig.set_pelvis([0, 0.585, pelvis_z], pitch=-90)
    rig.set_spine(flex=0, neck_flex=-6)
    for s in (-1, 1):
        rig.leg(s, np.array([s * 0.3, 0.085, feet_z]), [s * 0.4, 1.0, 0.2], toe_dir=ry(s * 15) @ np.array([0, 0, 1.0]))


@exercise("arms_skullcrushers", dict(target=[0, 0.7, 0.0], yaw=80, pitch=12, dist=3.7), ["triceps"])
def skullcrushers(ph, sc):
    rig = Rig()
    lying_on_bench(rig, sc)
    for s in (-1, 1):
        arm_plane(rig, s, [0, 1, -0.28], [0, -0.3, -1], 6 + 104 * ph, pron=75)
    c, ax = grips_mid(rig)
    barbell(sc, c, ax, plate_r=0.14, length=1.3)
    return rig


@exercise("arms_cable_tricep_pushdown", dict(target=[0, 1.02, 0.15], yaw=-128, pitch=6, dist=3.7), ["triceps"])
def pushdown(ph, sc):
    rig = Rig()
    stand(rig, pitch=6)
    rig.set_spine(flex=6)
    for s in (-1, 1):
        # Rope pushdown: the hands drift apart as the rope ends spread at lockout.
        arm_plane(rig, s, [s * 0.04 * ph, -1, 0.08], [s * 0.35 * ph, 0.3, 1], 100 - 95 * ph, pron=88)
    gl, gr = rig.grip(-1), rig.grip(1)
    knot = (gl + gr) / 2 + np.array([0, 0.11 + 0.05 * ph, 0.02])
    for g in (gl, gr):
        sc.cyl(g, knot, 0.012, MAT["cable"], 0.005)
        sc.cyl(g - np.array([0, 0.03, 0]), g + np.array([0, 0.012, 0]), 0.02, MAT["rubber"], 0.008)
    cable_tower(sc, [0, 0, 0.62], 180, 2.0, knot)
    return rig


@exercise("arms_overhead_tricep_extension", dict(target=[0, 1.15, 0], yaw=68, pitch=6, dist=3.6), ["triceps"])
def overhead_ext(ph, sc):
    rig = Rig()
    stand(rig)
    for s in (-1, 1):
        arm_plane(rig, s, [s * 0.16, 1, 0.12], [-s * 0.3, 0, -1], 125 - 112 * ph, pron=20)
    gl, gr = rig.grip(-1), rig.grip(1)
    fwd = nrm(rig.arms[-1]["W"] - rig.arms[-1]["E"] + rig.arms[1]["W"] - rig.arms[1]["E"])
    dumbbell(sc, (gl + gr) / 2 + fwd * 0.05, fwd, head_r=0.06, handle=0.12)
    return rig


# ------------------------------------------------------------------ shoulders

@exercise("shoulders_barbell_overhead_press", dict(target=[0, 1.18, 0], yaw=34, pitch=5, dist=3.9),
          ["delts_front", "delts_side"], ["triceps", "traps"])
def ohp(ph, sc):
    rig = Rig()
    stand(rig, width=0.14)
    rig.set_spine(flex=-3, neck_flex=-8 * (1 - ph))
    for s in (-1, 1):
        S = rig.shoulder(s)
        low = np.array([s * 0.26, S[1] + 0.02, 0.13])
        high = np.array([s * 0.26, S[1] + 0.52, 0.0])
        rig.arm(s, lerp(low, high, ph), lerp([s * 0.35, -1, 0.7], [s * 1, -0.1, 0.1], ph), pron=85)
    c, ax = grips_mid(rig)
    barbell(sc, c, ax, plate_r=0.18)
    return rig


@exercise("shoulders_dumbbell_lateral_raise", dict(target=[0, 1.05, 0], yaw=12, pitch=6, dist=3.5), ["delts_side"],
          ["delts_front", "traps"])
def lateral_raise(ph, sc):
    rig = Rig()
    stand(rig)
    rig.set_spine(flex=4)
    for s in (-1, 1):
        rig.arm_fk(s, elev=12 + 76 * ph, azim=18, elbow=14, pron=90)
        dumbbell(sc, rig.grip(s), rig.arms[s]["hand"][:, 0], head_r=0.045)
    return rig


@exercise("shoulders_face_pulls", dict(target=[0, 1.3, 0.15], yaw=142, pitch=8, dist=3.4), ["delts_rear"],
          ["traps", "midback"])
def face_pull(ph, sc):
    rig = Rig()
    stand(rig, pitch=-3, feet_z=0.0)
    hands = {}
    for s in (-1, 1):
        far = np.array([s * 0.07, 1.58, 0.56])
        near = np.array([s * 0.22, 1.66, 0.02])
        rig.arm(s, lerp(far, near, ph), lerp([s * 0.6, -0.6, 0.0], [s * 1, 0.35, -0.3], ph), pron=10)
        hands[s] = rig.grip(s)
    knot = (hands[-1] + hands[1]) / 2 + np.array([0, 0, 0.1 + 0.06 * ph])
    for s in (-1, 1):
        sc.cyl(hands[s], knot, 0.011, MAT["cable"], 0.004)
        sc.cyl(hands[s] - np.array([0, 0.035, 0]), hands[s] + np.array([0, 0.035, 0]), 0.017, MAT["rubber"], 0.006)
    cable_tower(sc, [0, 0, 1.15], 180, 1.62, knot)
    return rig


@exercise("shoulders_arnold_press", dict(target=[0, 0.95, 0.05], yaw=26, pitch=6, dist=4.0),
          ["delts_front", "delts_side"], ["triceps"])
def arnold(ph, sc):
    rig = Rig()
    flat_bench(sc, [0, 0, 0], yaw=180, incline=82, length=1.2)
    rig.set_pelvis([0, 0.6, 0.0], pitch=-6)
    rig.set_spine(flex=2)
    for s in (-1, 1):
        rig.leg(s, np.array([s * 0.22, 0.085, 0.5]), [s * 0.4, 0.3, 1.0], toe_dir=ry(s * 14) @ np.array([0, 0, 1.0]))
        S = rig.shoulder(s)
        start = S + rig.body_dir([-s * 0.03, 0.05, 0.2])
        end = S + rig.body_dir([s * 0.08, 0.52, 0.02])
        w = lerp(start, end, ph)
        pole = lerp(rig.body_dir([0, -1, 0.6]), rig.body_dir([s * 1, -0.2, 0]), min(1.0, ph * 1.3))
        rig.arm(s, w, pole, pron=160 - 70 * ph)
        dumbbell(sc, rig.grip(s), ry(s * 180 * ph) @ np.array([1.0, 0, 0]), head_r=0.048)
    return rig


# ------------------------------------------------------------------ chest

@exercise("chest_barbell_bench_press", dict(target=[0, 0.72, -0.05], yaw=78, pitch=14, dist=3.8), ["pecs"],
          ["delts_front", "triceps"], timing=(0.35, 1.0, 0.35, 1.4))
def bench(ph, sc):
    rig = Rig()
    lying_on_bench(rig, sc)
    for s in (-1, 1):
        chest = rig.chest_point([s * 0.3, 0.16, 0.13])
        top = rig.shoulder(s) + np.array([s * 0.1, 0.5, 0.03])
        rig.arm(s, lerp(chest, top, ph), [s * 1, -0.5, 0.45], pron=88)
    c, ax = grips_mid(rig)
    barbell(sc, c, ax)
    return rig


@exercise("chest_incline_dumbbell_press", dict(target=[0, 0.92, 0], yaw=58, pitch=10, dist=3.4), ["pecs"],
          ["delts_front", "triceps"])
def incline_press(ph, sc):
    rig = Rig()
    flat_bench(sc, [0, 0, 0], yaw=180, incline=36, length=1.3)
    rig.set_pelvis([0, 0.6, 0.03], pitch=-52)
    rig.set_spine(flex=0, neck_flex=18)
    for s in (-1, 1):
        rig.leg(s, np.array([s * 0.24, 0.085, 0.55]), [s * 0.4, 0.4, 1.0], toe_dir=ry(s * 14) @ np.array([0, 0, 1.0]))
        low = rig.chest_point([s * 0.3, 0.2, 0.1])
        high = rig.chest_point([s * 0.12, 0.25, 0.53])
        rig.arm(s, lerp(low, high, ph), rig.body_dir([s * 1, -0.4, -0.5]), pron=88)
        dumbbell(sc, rig.grip(s), rig.body_dir([1, 0, 0]))
    return rig


@exercise("chest_cable_crossover_fly", dict(target=[0, 1.12, 0], yaw=18, pitch=6, dist=4.2), ["pecs"], ["delts_front"])
def crossover(ph, sc):
    rig = Rig()
    stand(rig, width=0.15, pitch=10)
    rig.set_spine(flex=6)
    for s in (-1, 1):
        rig.arm_fk(s, elev=lerp(85, 55, ph), azim=lerp(-12, 88, ph), elbow=22, pron=40)
        g = rig.grip(s)
        sc.cyl(g - np.array([0, 0.04, 0]), g + np.array([0, 0.04, 0]), 0.016, MAT["rubber"], 0.006)
        cable_tower(sc, [s * 1.12, 0, -0.25], -90 * s, 1.95, g)
    return rig


@exercise("chest_push_up", dict(target=[0, 0.32, 0.0], yaw=42, pitch=7, dist=3.6), ["pecs"],
          ["triceps", "delts_front"], timing=(0.3, 1.25, 0.25, 1.0))
def push_up(ph, sc):
    rig = Rig()
    ankle_c = np.array([0, 0.115, -0.78])

    def body_at(alpha):
        d = np.array([0, math.sin(alpha * DEG), math.cos(alpha * DEG)])
        return d, ankle_c + d * 0.885

    alpha_top, alpha_bot = 20.0, 5.5
    alpha = lerp(alpha_top, alpha_bot, ph)
    d, pel = body_at(alpha)
    rig.set_pelvis(pel, pitch=90 - alpha)
    rig.set_spine(flex=0, neck_flex=-10)
    # Hands stay planted where they were at the top.
    top = Rig()
    dt, pt = body_at(alpha_top)
    top.set_pelvis(pt, pitch=90 - alpha_top)
    for s in (-1, 1):
        S0 = top.shoulder(s)
        wrist = np.array([s * 0.27, 0.075, S0[2] + 0.02])
        rig.arm(s, wrist, [s * 0.7, 1.0, -0.6], pron=90, wrist_flex=-70)
        straight_leg(rig, s, -d + np.array([0, -0.02, 0]), np.array([0, -1.0, 0.25]), np.array([0, 0.2, 1.0]))
    return rig


# ------------------------------------------------------------------ back

def hinge_pose(rig, pitch, pelvis_z, ankles_z, knee_pole=1.0, bar_y=None, min_z=None, width=0.13, pron=82):
    """Hip hinge with arms hanging. If bar_y is given the pelvis height is solved so the grips land at bar_y."""
    def place(py):
        rig.set_pelvis([0, py, pelvis_z], pitch=pitch)
        rig.set_spine(flex=0, neck_flex=-0.4 * pitch)
        for s in (-1, 1):
            hang_arm(rig, s, min_z=min_z, pron=pron)
        return grips_mid(rig)[0][1]

    py = 0.97
    if bar_y is not None:
        g = place(py)
        py += bar_y - g
    place(py)
    for s in (-1, 1):
        rig.leg(s, np.array([s * width, 0.085, ankles_z]), [s * 0.25, 0, knee_pole], toe_dir=ry(s * 10) @ np.array([0, 0, 1.0]))


@exercise("back_barbell_deadlift", dict(target=[0, 0.75, 0.0], yaw=72, pitch=7, dist=3.6), ["erectors", "glutes", "hamstrings"],
          ["traps", "quads", "forearms"], timing=(0.4, 1.2, 0.35, 1.3))
def deadlift(ph, sc):
    rig = Rig()
    pitch = lerp(72, 0, ph)
    bar_y = lerp(0.205, 0.0, ph)
    if ph > 0.999:
        bar_y = None
    # Find lockout grip height once, then interpolate the bar height.
    lock = Rig()
    hinge_pose(lock, 0, -0.02, 0.06, min_z=0.13)
    lock_y = grips_mid(lock)[0][1]
    hinge_pose(rig, pitch, lerp(-0.38, -0.02, ph), 0.06, bar_y=lerp(0.205, lock_y, ph), min_z=0.13, knee_pole=1.0)
    c, ax = grips_mid(rig)
    barbell(sc, c, ax)
    return rig


@exercise("back_lat_pulldown", dict(target=[0, 1.15, 0], yaw=152, pitch=10, dist=3.9), ["lats"],
          ["biceps", "midback", "delts_rear"])
def pulldown(ph, sc):
    rig = Rig()
    seat_box(sc, [0, 0.5, -0.02], [0.2, 0.04, 0.2])
    floor_post(sc, [0, 0.46, -0.02], 0.035)
    rig.set_pelvis([0, 0.63, 0.0], pitch=-10 * ph - 4)
    rig.set_spine(flex=-4 * ph, neck_flex=-6)
    for s in (-1, 1):
        rig.leg(s, np.array([s * 0.15, 0.085, 0.44]), [s * 0.3, 0.3, 1.0], toe_dir=ry(s * 10) @ np.array([0, 0, 1.0]))
        top = np.array([s * 0.42, 1.64, 0.08])
        low = np.array([s * 0.36, 1.18, 0.16])
        rig.arm(s, lerp(top, low, ph), [s * 1, -0.6, -0.5], pron=85)
    c, ax = grips_mid(rig)
    ax = nrm(ax)
    handle_bar(sc, c - ax * 0.6, c + ax * 0.6, 0.015)
    for s in (-1, 1):
        sc.cyl(c + ax * s * 0.6, c + ax * s * 0.66 - np.array([0, 0.06, 0]), 0.015, MAT["steel"], 0.004)
    pulley = np.array([0, 2.28, 0.1])
    sc.cyl(pulley, c, 0.006, MAT["cable"], 0.002)
    # thigh pad + frame
    sc.cyl([-0.24, 0.79, 0.3], [0.24, 0.79, 0.3], 0.05, MAT["pad"], 0.02)
    sc.box([0, 0.66, 0.3], np.eye(3), [0.03, 0.13, 0.03], MAT["frame"], 0.006)
    sc.box([0, 1.2, 0.85], np.eye(3), [0.05, 1.2, 0.05], MAT["frame"], 0.01)
    sc.box([0, 2.36, 0.45], np.eye(3), [0.05, 0.05, 0.42], MAT["frame"], 0.01)
    sc.box([0, 0.6, 0.95], np.eye(3), [0.16, 0.3, 0.05], MAT["stack"], 0.008)
    sc.cyl([-0.02, 2.28, 0.1], [0.02, 2.28, 0.1], 0.05, MAT["frame"], 0.006)
    sc.box([0, 0.03, 0.4], np.eye(3), [0.3, 0.03, 0.6], MAT["frame"], 0.01)
    return rig


@exercise("back_bent_over_row", dict(target=[0, 0.85, 0.05], yaw=118, pitch=12, dist=3.5), ["lats", "midback"],
          ["biceps", "delts_rear", "traps"])
def row(ph, sc):
    rig = Rig()
    rig.set_pelvis([0, 0.88, -0.14], pitch=50)
    rig.set_spine(flex=-4, neck_flex=-22)
    for s in (-1, 1):
        rig.leg(s, np.array([s * 0.15, 0.085, 0.04]), [s * 0.25, 0, 1.0], toe_dir=ry(s * 10) @ np.array([0, 0, 1.0]))
        S = rig.shoulder(s)
        hang = S + np.array([s * 0.06, -(ARM - 0.01), 0.04])
        pulled = rig.chest_point([s * 0.25, -0.02, 0.17])
        rig.arm(s, lerp(hang, pulled, ph), lerp([s * 0.3, 0.2, -1.0], [s * 0.4, 1.0, -0.6], ph), pron=82)
    c, ax = grips_mid(rig)
    barbell(sc, c, ax)
    return rig


# ------------------------------------------------------------------ abs

@exercise("abs_straight_arm_crunch", dict(target=[0, 0.35, -0.1], yaw=62, pitch=16, dist=3.0), ["abs"], ["obliques"],
          timing=(0.3, 0.9, 0.4, 1.1))
def crunch(ph, sc):
    rig = Rig()
    rig.set_pelvis([0, 0.112, 0.0], pitch=-90)
    rig.set_spine(flex=16 * ph, chest_flex=26 * ph, neck_flex=8 + 10 * ph)
    for s in (-1, 1):
        rig.leg(s, np.array([s * 0.13, 0.085, 0.5]), [s * 0.2, 1.0, 0.2])
        reach = rig.chest_point([s * 0.05, 0.24, 0.5])
        rig.arm(s, reach, rig.body_dir([s * 1.0, 0, -0.2]), pron=90)
    gl, gr = rig.grip(-1), rig.grip(1)
    up = nrm(rig.arms[1]["W"] - rig.arms[1]["E"])
    dumbbell(sc, (gl + gr) / 2 + up * 0.04, up, head_r=0.055, handle=0.11)
    seat_box(sc, [0, 0.008, -0.25], [0.32, 0.008, 0.95], MAT["mat"], rnd=0.006)
    return rig


@exercise("abs_hanging_leg_raise", dict(target=[0, 1.35, 0.1], yaw=64, pitch=6, dist=4.4), ["abs"], ["obliques", "quads"],
          timing=(0.35, 1.1, 0.4, 1.3))
def leg_raise(ph, sc):
    rig = Rig()
    bar_y = 2.32
    pullup_bar(sc, height=bar_y, z=0.0)
    lean = -14 * ph
    th = 88 * ph

    def place(py, pz):
        rig.set_pelvis([0, py, pz], pitch=lean)
        rig.set_spine(flex=8 * ph)
        for s in (-1, 1):
            rig.arm(s, np.array([s * 0.3, bar_y - 0.055, 0.0]), [s * 1, 0, -0.3], pron=90, wrist_flex=0)

    place(1.15, 0.02 + 0.1 * ph)
    # lift the body so the arms are just straight under the bar
    S = rig.shoulder(1)
    need = math.sqrt(max(ARM ** 2 - 0.12 ** 2, 0.1)) - 0.01
    place(1.15 + (bar_y - 0.055 - need) - S[1], 0.02 + 0.1 * ph)
    for s in (-1, 1):
        d = rx(-th) @ np.array([0, -1.0, 0])
        straight_leg(rig, s, d + np.array([s * 0.02, 0, 0]), rx(-th) @ np.array([0, -0.35, 1.0]), rx(-th) @ np.array([0, 1.0, 0.35]))
    return rig


@exercise("abs_cable_woodchopper", dict(target=[0, 1.08, 0], yaw=14, pitch=6, dist=4.2), ["obliques", "abs"], ["delts_front"],
          timing=(0.3, 0.9, 0.3, 1.2))
def woodchop(ph, sc):
    rig = Rig()
    stand(rig, width=0.22)
    rig.set_spine(twist=lerp(-38, 32, ph), side=lerp(6, -8, ph), chest_flex=lerp(0, 10, ph), neck_twist=lerp(-10, 10, ph))
    hi = np.array([-0.5, 1.78, 0.3])
    lo = np.array([0.42, 0.86, 0.34])
    p = lerp(hi, lo, ph)
    dirv = nrm(lo - hi)
    side = nrm(np.cross(dirv, [0, 0, 1]))
    for s in (-1, 1):
        rig.arm(s, p + side * 0.035 * s - dirv * 0.03 * (s + 1), [s * 0.4, -1, 0.2], pron=80)
    g = (rig.grip(-1) + rig.grip(1)) / 2
    sc.cyl(g - dirv * 0.06, g + dirv * 0.06, 0.016, MAT["rubber"], 0.006)
    cable_tower(sc, [-1.15, 0, -0.05], 90, 2.0, g)
    return rig


@exercise("abs_plank_hold", dict(target=[0, 0.3, 0.0], yaw=58, pitch=9, dist=3.7), ["abs", "obliques"],
          ["delts_front", "glutes"], timing=(0.0, 1.6, 0.4, 1.6))
def plank(ph, sc):
    rig = Rig()
    alpha = 10.0 - 1.2 * ph
    d = np.array([0, math.sin(alpha * DEG), math.cos(alpha * DEG)])
    ankle_c = np.array([0, 0.115, -0.82])
    rig.set_pelvis(ankle_c + d * 0.885 + np.array([0, 0.012 * ph, 0]), pitch=90 - alpha)
    rig.set_spine(flex=-1.5 * ph, neck_flex=-12)
    for s in (-1, 1):
        S = rig.shoulder(s)
        rig.arm(s, np.array([s * 0.13, 0.06, S[2] + 0.24]), [s * 0.2, -1, -0.2], pron=60)
        straight_leg(rig, s, -d + np.array([0, -0.02, 0]), np.array([0, -1.0, 0.25]), np.array([0, 0.2, 1.0]))
    seat_box(sc, [0, 0.008, -0.2], [0.35, 0.008, 1.0], MAT["mat"], rnd=0.006)
    return rig


# ------------------------------------------------------------------ legs (cont.)

@exercise("legs_romanian_deadlift", dict(target=[0, 0.8, 0.0], yaw=128, pitch=8, dist=3.6), ["hamstrings", "glutes"],
          ["erectors"], timing=(0.35, 1.4, 0.25, 1.1))
def rdl(ph, sc):
    rig = Rig()
    pitch = 68 * ph
    rig.set_pelvis([0, 0.95 - 0.07 * ph, -0.03 - 0.2 * ph], pitch=pitch)
    rig.set_spine(flex=-3 * ph, neck_flex=-0.45 * pitch)
    for s in (-1, 1):
        rig.leg(s, np.array([s * 0.13, 0.085, 0.05]), [s * 0.2, 0, 1.0], toe_dir=ry(s * 8) @ np.array([0, 0, 1.0]))
        hang_arm(rig, s, min_z=0.13, pron=82)
    c, ax = grips_mid(rig)
    barbell(sc, c, ax)
    return rig


@exercise("legs_leg_extension", dict(target=[0, 0.72, 0.1], yaw=66, pitch=8, dist=3.1), ["quads"])
def leg_ext(ph, sc):
    rig = Rig()
    seat_box(sc, [0, 0.52, -0.05], [0.22, 0.045, 0.24])
    sc.box([0, 0.92, -0.33], rx(-12), [0.2, 0.32, 0.045], MAT["pad"], 0.03)
    sc.box([0, 0.24, -0.1], np.eye(3), [0.05, 0.24, 0.2], MAT["frame"], 0.01)
    sc.box([0, 0.03, 0.0], np.eye(3), [0.32, 0.03, 0.45], MAT["frame"], 0.01)
    rig.set_pelvis([0, 0.67, -0.12], pitch=-10)
    rig.set_spine(flex=4)
    th = 82 * ph
    for s in (-1, 1):
        H = rig.hip(s)
        K = np.array([H[0], H[1] - 0.02, H[2] + L_TH - 0.005])
        d = np.array([0, -math.cos(th * DEG), math.sin(th * DEG)])
        A = K + d * L_SH
        rig.leg(s, A, [0, 1, 0.3], toe_dir=np.array([0, math.sin(th * DEG), math.cos(th * DEG)]) + np.array([0, 0.2, 0]),
                foot_up=np.array([0, math.cos(th * DEG), -math.sin(th * DEG)]))
        rig.arm(s, np.array([s * 0.3, 0.6, -0.02]), [s * 0.3, 0.2, -1], pron=90)
        sc.cyl([s * 0.27, 0.6, -0.02], [s * 0.34, 0.6, -0.02], 0.018, MAT["rubber"], 0.006)
    K = rig.legs[1]["K"]
    A = (rig.legs[1]["A"] + rig.legs[-1]["A"]) / 2
    d = np.array([0, -math.cos(th * DEG), math.sin(th * DEG)])
    roller = A + np.array([0, 0.0, 0]) + np.cross([1, 0, 0], d) * -0.075 - d * 0.02
    roller[0] = 0
    sc.cyl(roller + np.array([-0.24, 0, 0]), roller + np.array([0.24, 0, 0]), 0.05, MAT["pad"], 0.02)
    piv = np.array([0.3, K[1], K[2]])
    sc.cyl(piv - np.array([0.02, 0, 0]), piv + np.array([0.04, 0, 0]), 0.05, MAT["frame"], 0.008)
    sc.cyl(piv, np.array([0.3, roller[1], roller[2]]), 0.022, MAT["frame"], 0.005)
    sc.cyl(np.array([0.24, roller[1], roller[2]]), np.array([0.3, roller[1], roller[2]]), 0.02, MAT["frame"], 0.005)
    sc.box([0.3, K[1] / 2, K[2]], np.eye(3), [0.03, K[1] / 2, 0.03], MAT["frame"], 0.006)
    return rig


@exercise("legs_standing_calf_raise", dict(target=[0, 0.7, 0], yaw=128, pitch=4, dist=3.5), ["calves"],
          timing=(0.3, 0.8, 0.5, 1.1))
def calf_raise(ph, sc):
    rig = Rig()
    step_top = 0.12
    sc.box([0, step_top / 2, 0.24], np.eye(3), [0.38, step_top / 2, 0.15], MAT["pad"], 0.015)
    phi = lerp(-16, 40, ph)

    def foot(s):
        toe = np.array([0, -math.sin(phi * DEG), math.cos(phi * DEG)])
        up = np.array([0, math.cos(phi * DEG), math.sin(phi * DEG)])
        R = np.column_stack([np.cross(up, toe), up, toe])
        ball = np.array([s * 0.13, step_top, 0.2])
        return ball - R @ np.array([0, -0.078, 0.12]), toe, up

    a0, _, _ = foot(1)
    rig.set_pelvis([0, 0.97 + (a0[1] - 0.085) - 0.005, 0.0])
    rig.set_spine()
    for s in (-1, 1):
        ankle, toe, up = foot(s)
        rig.leg(s, ankle, [s * 0.1, 0, 1.0], toe_dir=toe, foot_up=up)
        rig.arm_fk(s, elev=5, azim=0, elbow=6, pron=90)
        dumbbell(sc, rig.grip(s), rig.arms[s]["hand"][:, 0], head_r=0.055)
    return rig
