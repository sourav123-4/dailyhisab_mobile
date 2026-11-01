// Signed-distance-field ray marcher for exercise demo clips.
// Reads a scene file (camera + per-frame primitive lists) and writes raw RGB24 frames to stdout.
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { float x, y, z; } v3;
static inline v3 V(float x, float y, float z) { v3 r = {x, y, z}; return r; }
static inline v3 add(v3 a, v3 b) { return V(a.x + b.x, a.y + b.y, a.z + b.z); }
static inline v3 sub(v3 a, v3 b) { return V(a.x - b.x, a.y - b.y, a.z - b.z); }
static inline v3 mul(v3 a, float s) { return V(a.x * s, a.y * s, a.z * s); }
static inline v3 vmul(v3 a, v3 b) { return V(a.x * b.x, a.y * b.y, a.z * b.z); }
static inline float dot(v3 a, v3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
static inline v3 cross(v3 a, v3 b) { return V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
static inline float len(v3 a) { return sqrtf(dot(a, a)); }
static inline v3 norm(v3 a) { return mul(a, 1.0f / len(a)); }
static inline float clampf(float x, float a, float b) { return x < a ? a : (x > b ? b : x); }
static inline float mixf(float a, float b, float t) { return a + (b - a) * t; }
static inline v3 mixv(v3 a, v3 b, float t) { return add(a, mul(sub(b, a), t)); }
static inline float signf(float x) { return x < 0 ? -1.0f : 1.0f; }

enum { ROUNDCONE = 0, ELLIPSOID = 1, CYLINDER = 2, BOX = 3 };

typedef struct {
  int type, mat;
  float k;
  v3 a, b;
  float ra, rb;
  v3 r0, r1, r2; // world -> local rotation rows
  v3 s;
  float round;
  int tex; // 1 = muscle belly: fibres drawn along local Y
  v3 bc; // bounding sphere
  float br;
} Prim;

#define MAXP 256
static Prim prims[MAXP];
static int nprims;
static v3 matColor[32];
static float matSpec[32], matGloss[32];

static float sdRoundCone(v3 p, v3 a, v3 b, float r1, float r2) {
  v3 ba = sub(b, a);
  float l2 = dot(ba, ba);
  float rr = r1 - r2;
  float a2 = l2 - rr * rr;
  float il2 = 1.0f / l2;
  v3 pa = sub(p, a);
  float y = dot(pa, ba);
  float z = y - l2;
  v3 q = sub(mul(pa, l2), mul(ba, y));
  float x2 = dot(q, q);
  float y2 = y * y * l2;
  float z2 = z * z * l2;
  float k = signf(rr) * rr * rr * x2;
  if (signf(z) * a2 * z2 > k) return sqrtf(x2 + z2) * il2 - r2;
  if (signf(y) * a2 * y2 < k) return sqrtf(x2 + y2) * il2 - r1;
  return (sqrtf(x2 * a2 * il2) + y * rr) * il2 - r1;
}

static float sdEllipsoid(v3 p, v3 r) {
  float k0 = len(V(p.x / r.x, p.y / r.y, p.z / r.z));
  float k1 = len(V(p.x / (r.x * r.x), p.y / (r.y * r.y), p.z / (r.z * r.z)));
  return k0 * (k0 - 1.0f) / k1;
}

static float sdCylinder(v3 p, v3 a, v3 b, float r) {
  v3 ba = sub(b, a), pa = sub(p, a);
  float baba = dot(ba, ba), paba = dot(pa, ba);
  float x = len(sub(mul(pa, baba), mul(ba, paba))) - r * baba;
  float y = fabsf(paba - baba * 0.5f) - baba * 0.5f;
  float x2 = x * x, y2 = y * y * baba;
  float d = (fmaxf(x, y) < 0.0f) ? -fminf(x2, y2 * 1.0f) : (((x > 0.0f) ? x2 : 0.0f) + ((y > 0.0f) ? y2 : 0.0f));
  return signf(d) * sqrtf(fabsf(d)) / baba;
}

static float sdBox(v3 p, v3 b, float r) {
  v3 q = V(fabsf(p.x) - b.x + r, fabsf(p.y) - b.y + r, fabsf(p.z) - b.z + r);
  v3 m = V(fmaxf(q.x, 0), fmaxf(q.y, 0), fmaxf(q.z, 0));
  return len(m) + fminf(fmaxf(q.x, fmaxf(q.y, q.z)), 0.0f) - r;
}

static inline v3 toLocal(const Prim *P, v3 p) {
  v3 d = sub(p, P->a);
  return V(dot(P->r0, d), dot(P->r1, d), dot(P->r2, d));
}

static float primDist(const Prim *P, v3 p) {
  switch (P->type) {
  case ROUNDCONE: return sdRoundCone(p, P->a, P->b, P->ra, P->rb);
  case ELLIPSOID: return sdEllipsoid(toLocal(P, p), P->s);
  case CYLINDER: return sdCylinder(p, P->a, P->b, P->ra - P->round) - P->round;
  default: return sdBox(toLocal(P, p), P->s, P->round);
  }
}

// Scene distance over a candidate list. If col != NULL, also blends material colour/spec.
static float sceneDist(v3 p, const int *cand, int nc, v3 *col, float *spec, float *gloss) {
  float d = 1e9f;
  v3 c = V(0, 0, 0);
  float sp = 0, gl = 0;
  for (int i = 0; i < nc; i++) {
    const Prim *P = &prims[cand[i]];
    // Skip primitives that are clearly far away.
    float bd = len(sub(p, P->bc)) - P->br - P->k;
    if (bd > d) continue;
    float di = primDist(P, p);
    if (P->k <= 0.0f || d >= 1e8f) {
      if (di < d) {
        d = di;
        if (col) { c = matColor[P->mat]; sp = matSpec[P->mat]; gl = matGloss[P->mat]; }
      }
    } else {
      float h = clampf(0.5f + 0.5f * (di - d) / P->k, 0.0f, 1.0f);
      float nd = mixf(di, d, h) - P->k * h * (1.0f - h);
      if (col) {
        c = mixv(matColor[P->mat], c, h);
        sp = mixf(matSpec[P->mat], sp, h);
        gl = mixf(matGloss[P->mat], gl, h);
      }
      d = nd;
    }
  }
  if (col) { *col = c; *spec = sp; *gloss = gl; }
  return d;
}

static int raySphere(v3 ro, v3 rd, v3 c, float r, float *t0, float *t1) {
  v3 oc = sub(ro, c);
  float b = dot(oc, rd);
  float cc = dot(oc, oc) - r * r;
  float h = b * b - cc;
  if (h < 0) return 0;
  h = sqrtf(h);
  *t0 = -b - h;
  *t1 = -b + h;
  return *t1 > 0;
}

static int gatherRay(v3 ro, v3 rd, float tmax, int *cand, float *tnear, float *tfar) {
  int n = 0;
  float tn = 1e9f, tf = 0;
  for (int i = 0; i < nprims; i++) {
    float t0, t1;
    if (raySphere(ro, rd, prims[i].bc, prims[i].br + prims[i].k + 0.002f, &t0, &t1) && t0 < tmax) {
      cand[n++] = i;
      if (t0 < tn) tn = t0;
      if (t1 > tf) tf = t1;
    }
  }
  *tnear = fmaxf(tn, 0.0f);
  *tfar = tf;
  return n;
}

static int gatherNear(v3 p, float r, int *cand) {
  int n = 0;
  for (int i = 0; i < nprims; i++)
    if (len(sub(p, prims[i].bc)) - prims[i].br - prims[i].k < r) cand[n++] = i;
  return n;
}

static v3 lightDir, camPos, camTarget;
static float fov;
static v3 wallN;
static float wallD;

static float softShadow(v3 p, v3 l) {
  int cand[MAXP];
  float tn, tf;
  int nc = gatherRay(p, l, 20.0f, cand, &tn, &tf);
  if (nc == 0) return 1.0f;
  float res = 1.0f, t = fmaxf(tn, 0.004f), ph = 1e10f;
  for (int i = 0; i < 96 && t < tf; i++) {
    float h = sceneDist(add(p, mul(l, t)), cand, nc, NULL, NULL, NULL);
    if (h < 0.0005f) return 0.0f;
    float y = h * h / (2.0f * ph);
    float d = sqrtf(fmaxf(h * h - y * y, 0.0f));
    res = fminf(res, 12.0f * d / fmaxf(0.0f, t - y));
    ph = h;
    t += clampf(h, 0.003f, 0.12f);
  }
  return clampf(res, 0.0f, 1.0f);
}

static float ambientOcc(v3 p, v3 n) {
  int cand[MAXP];
  int nc = gatherNear(p, 0.35f, cand);
  if (nc == 0) return 1.0f;
  float occ = 0.0f, sca = 1.0f;
  for (int i = 0; i < 6; i++) {
    float h = 0.01f + 0.05f * (float)i;
    float d = sceneDist(add(p, mul(n, h)), cand, nc, NULL, NULL, NULL);
    occ += (h - d) * sca;
    sca *= 0.82f;
  }
  return clampf(1.0f - 2.8f * occ, 0.0f, 1.0f);
}

static float hash1(float n) {
  float s = sinf(n) * 43758.5453f;
  return s - floorf(s);
}

static v3 shade(v3 p, v3 n, v3 rd, v3 base, float spec, float gloss, float ao) {
  float sh = softShadow(add(p, mul(n, 0.003f)), lightDir);
  float dif = clampf(dot(n, lightDir), 0.0f, 1.0f) * sh;
  // Fill from the camera side opposite the key, plus a cool rim from behind.
  v3 fillDir = norm(V(-lightDir.x, 0.35f, -lightDir.z));
  float fill = clampf(dot(n, fillDir) * 0.5f + 0.5f, 0.0f, 1.0f);
  float sky = clampf(0.5f + 0.5f * n.y, 0.0f, 1.0f);
  v3 viewBack = norm(V(-rd.x, 0.0f, -rd.z));
  float rim = powf(clampf(1.0f + dot(n, rd), 0.0f, 1.0f), 3.0f) * clampf(dot(n, mul(viewBack, -1.0f)) * 0.5f + 0.6f, 0, 1);
  v3 hv = norm(sub(lightDir, rd));
  float spe = powf(clampf(dot(n, hv), 0.0f, 1.0f), gloss) * spec * sh * (gloss + 8.0f) / 64.0f;

  float aoS = 0.35f + 0.65f * ao;
  float bounce = clampf(0.5f - 0.5f * n.y, 0.0f, 1.0f);
  v3 lin = mul(V(0.55f, 0.42f, 0.32f), 0.38f * bounce * aoS);
  lin = add(lin, mul(V(1.30f, 1.22f, 1.12f), 1.65f * dif));
  lin = add(lin, mul(V(0.55f, 0.58f, 0.66f), 0.42f * fill * aoS));
  lin = add(lin, mul(V(0.62f, 0.64f, 0.70f), 0.34f * sky * aoS));
  v3 col = vmul(base, lin);
  col = add(col, mul(V(1.0f, 1.0f, 1.0f), spe));
  col = add(col, mul(V(0.75f, 0.78f, 0.85f), 0.35f * rim * ao));
  return col;
}

static v3 floorColor(v3 p) {
  float plank = floorf(p.x / 0.16f);
  float off = hash1(plank * 7.13f) * 3.0f;
  float seg = floorf((p.z + off) / 1.2f);
  float v = hash1(plank * 3.7f + seg * 11.1f);
  float grain = 0.5f + 0.5f * sinf(p.z * 9.0f + sinf(p.z * 2.3f + plank) * 2.0f + plank * 5.0f);
  v3 c = mixv(V(0.42f, 0.22f, 0.10f), V(0.60f, 0.35f, 0.17f), 0.35f + 0.45f * v);
  c = mul(c, 0.9f + 0.12f * grain);
  float ex = fabsf(p.x / 0.16f - plank - 0.5f);
  float ez = fabsf((p.z + off) / 1.2f - seg - 0.5f);
  if (ex > 0.485f || ez > 0.497f) c = mul(c, 0.55f);
  return c;
}

static v3 render(v3 ro, v3 rd) {
  int cand[MAXP];
  float tFloor = rd.y < 0 ? -ro.y / rd.y : 1e9f;
  float denom = dot(wallN, rd);
  float tWall = denom < -1e-4f ? (wallD - dot(wallN, ro)) / denom : 1e9f;
  float tEnv = fminf(tFloor, tWall);

  float tn, tf;
  int nc = gatherRay(ro, rd, tEnv, cand, &tn, &tf);
  float t = tn;
  int hit = 0;
  if (nc > 0) {
    float tm = fminf(tf, tEnv);
    for (int i = 0; i < 220 && t < tm; i++) {
      float d = sceneDist(add(ro, mul(rd, t)), cand, nc, NULL, NULL, NULL);
      if (d < 0.00035f * t) { hit = 1; break; }
      t += d * 0.9f;
    }
  }

  if (hit) {
    v3 p = add(ro, mul(rd, t));
    int nearC[MAXP];
    int nn = gatherNear(p, 0.02f, nearC);
    const float e = 0.0006f;
    v3 n = norm(V(
        sceneDist(add(p, V(e, 0, 0)), nearC, nn, NULL, NULL, NULL) - sceneDist(sub(p, V(e, 0, 0)), nearC, nn, NULL, NULL, NULL),
        sceneDist(add(p, V(0, e, 0)), nearC, nn, NULL, NULL, NULL) - sceneDist(sub(p, V(0, e, 0)), nearC, nn, NULL, NULL, NULL),
        sceneDist(add(p, V(0, 0, e)), nearC, nn, NULL, NULL, NULL) - sceneDist(sub(p, V(0, 0, e)), nearC, nn, NULL, NULL, NULL)));
    v3 base;
    float spec, gloss;
    sceneDist(p, nearC, nn, &base, &spec, &gloss);
    float ao = ambientOcc(p, n);

    // Anatomy-chart detailing: dark seams where two body parts meet, fibres on muscle bellies,
    // and a soft contour line, which together give the illustrated muscle definition.
    float d1 = 1e9f, d2 = 1e9f;
    int i1 = -1;
    for (int i = 0; i < nn; i++) {
      const Prim *P = &prims[nearC[i]];
      if (P->mat > 2) continue;
      float d = primDist(P, p);
      if (d < d1) { d2 = d1; d1 = d; i1 = nearC[i]; }
      else if (d < d2) d2 = d;
    }
    int bodyHit = i1 >= 0 && d1 < 0.004f;
    if (bodyHit) {
      float gap = d2 - d1;
      float t = clampf(gap / 0.0075f, 0.0f, 1.0f);
      float seam = 1.0f - t * t * (3.0f - 2.0f * t);
      base = mul(base, 1.0f - 0.7f * seam);
      const Prim *P = &prims[i1];
      if (P->tex && P->type == ELLIPSOID) {
        v3 l = toLocal(P, p);
        v3 q = V(l.x / P->s.x, l.y / P->s.y, l.z / P->s.z);
        float circ = 3.14159f * (P->s.x + P->s.z);
        float N = floorf(circ / 0.011f) + 1.0f;
        float theta = atan2f(q.z, q.x);
        float fib = fabsf(sinf(theta * N + q.y * 1.3f));
        float line = powf(fib, 5.0f);
        float along = clampf(1.0f - q.y * q.y, 0.0f, 1.0f);
        float strength = P->mat == 0 ? 0.26f : 0.34f;
        base = mul(base, 1.0f - strength * line * along);
        if (P->mat != 0) base = add(base, mul(V(0.10f, 0.03f, 0.02f), (1.0f - fib) * along));
      }
    }
    v3 col = shade(p, n, rd, base, spec, gloss, ao);
    if (bodyHit) {
      float facing = clampf(dot(n, mul(rd, -1.0f)), 0.0f, 1.0f);
      float edge = clampf(facing / 0.32f, 0.0f, 1.0f);
      col = mul(col, 0.45f + 0.55f * edge);
    }
    return col;
  }

  if (tFloor < tWall) {
    v3 p = add(ro, mul(rd, tFloor));
    v3 n = V(0, 1, 0);
    v3 base = floorColor(p);
    float ao = ambientOcc(p, n);
    v3 c = shade(p, n, rd, base, 0.25f, 40.0f, ao);
    // Reflection-ish sheen near the horizon and a gentle falloff with distance.
    float fall = clampf(1.0f - (tFloor - 3.0f) * 0.05f, 0.6f, 1.0f);
    return mul(c, fall * 0.85f);
  }
  if (tWall < 1e8f) {
    v3 p = add(ro, mul(rd, tWall));
    float g = clampf(1.0f - fabsf(p.y - 1.3f) * 0.32f, 0.0f, 1.0f);
    v3 c = mixv(V(0.16f, 0.16f, 0.165f), V(0.46f, 0.46f, 0.47f), g);
    float floorAo = clampf(p.y * 2.5f, 0.55f, 1.0f);
    // Soft shadow of the figure on the wall.
    float sh = softShadow(add(p, mul(wallN, 0.01f)), lightDir);
    return mul(c, floorAo * (0.72f + 0.28f * sh));
  }
  return V(0.05f, 0.05f, 0.055f);
}

static float tonemap(float x) {
  // ACES filmic approximation followed by gamma.
  float a = 2.51f, b = 0.03f, c = 2.43f, d = 0.59f, e = 0.14f;
  float y = clampf((x * (a * x + b)) / (x * (c * x + d) + e), 0.0f, 1.0f);
  return powf(y, 1.0f / 2.2f);
}

static void finishPrim(Prim *P) {
  switch (P->type) {
  case ROUNDCONE:
  case CYLINDER: {
    P->bc = mul(add(P->a, P->b), 0.5f);
    float half = len(sub(P->b, P->a)) * 0.5f;
    float r = fmaxf(P->ra, P->rb);
    P->br = P->type == CYLINDER ? sqrtf(half * half + r * r) : half + r;
    break;
  }
  case ELLIPSOID:
    P->bc = P->a;
    P->br = fmaxf(P->s.x, fmaxf(P->s.y, P->s.z));
    break;
  default:
    P->bc = P->a;
    P->br = len(P->s);
  }
}

static void setMat(int i, float r, float g, float b, float spec, float gloss) {
  matColor[i] = V(r, g, b);
  matSpec[i] = spec;
  matGloss[i] = gloss;
}

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "usage: render scene.txt\n"); return 1; }
  FILE *f = fopen(argv[1], "r");
  if (!f) { perror("scene"); return 1; }

  setMat(0, 0.48f, 0.48f, 0.50f, 0.30f, 20.0f);   // skin (grey anatomy model)
  setMat(1, 0.80f, 0.12f, 0.06f, 0.35f, 28.0f);   // target muscle
  setMat(2, 0.86f, 0.36f, 0.20f, 0.40f, 28.0f);   // secondary muscle
  setMat(3, 0.025f, 0.025f, 0.03f, 0.20f, 16.0f); // shorts
  setMat(4, 0.04f, 0.035f, 0.03f, 0.10f, 8.0f);   // hair
  setMat(5, 0.10f, 0.08f, 0.08f, 0.10f, 8.0f);    // brows / eyes
  setMat(10, 0.55f, 0.56f, 0.58f, 1.6f, 90.0f);   // steel
  setMat(11, 0.03f, 0.03f, 0.035f, 0.6f, 40.0f);  // rubber plates
  setMat(12, 0.035f, 0.035f, 0.04f, 0.45f, 30.0f); // upholstery
  setMat(13, 0.70f, 0.71f, 0.73f, 0.6f, 50.0f);   // machine frame
  setMat(14, 0.02f, 0.02f, 0.02f, 0.3f, 20.0f);   // cable
  setMat(15, 0.07f, 0.07f, 0.08f, 0.5f, 30.0f);   // weight stack
  setMat(16, 0.75f, 0.12f, 0.08f, 0.4f, 30.0f);   // red plate accent
  setMat(17, 0.05f, 0.12f, 0.16f, 0.25f, 20.0f);  // exercise mat

  int W, H, SS, frames;
  float lx, ly, lz;
  if (fscanf(f, " RES %d %d %d", &W, &H, &SS) != 3) return 2;
  if (fscanf(f, " CAM %f %f %f %f %f %f %f", &camPos.x, &camPos.y, &camPos.z, &camTarget.x, &camTarget.y, &camTarget.z, &fov) != 7) return 3;
  if (fscanf(f, " LIGHT %f %f %f", &lx, &ly, &lz) != 3) return 4;
  lightDir = norm(V(lx, ly, lz));
  if (fscanf(f, " WALL %f %f %f %f", &wallN.x, &wallN.y, &wallN.z, &wallD) != 4) return 5;
  if (fscanf(f, " FRAMES %d", &frames) != 1) return 6;

  int RW = W * SS, RH = H * SS;
  float *acc = malloc(sizeof(float) * 3 * W * H);
  unsigned char *out = malloc(3 * W * H);
  v3 fw = norm(sub(camTarget, camPos));
  v3 rt = norm(cross(fw, V(0, 1, 0)));
  v3 up = cross(rt, fw);
  float fl = 1.0f / tanf(fov * 0.5f * (float)M_PI / 180.0f);

  for (int fr = 0; fr < frames; fr++) {
    if (fscanf(f, " F %d", &nprims) != 1) return 7;
    for (int i = 0; i < nprims; i++) {
      Prim *P = &prims[i];
      float v[25];
      for (int j = 0; j < 25; j++)
        if (fscanf(f, " %f", &v[j]) != 1) return 8;
      P->type = (int)v[0];
      P->mat = (int)v[1];
      P->k = v[2];
      P->a = V(v[3], v[4], v[5]);
      P->b = V(v[6], v[7], v[8]);
      P->ra = v[9];
      P->rb = v[10];
      P->r0 = V(v[11], v[12], v[13]);
      P->r1 = V(v[14], v[15], v[16]);
      P->r2 = V(v[17], v[18], v[19]);
      P->s = V(v[20], v[21], v[22]);
      P->round = v[23];
      P->tex = (int)v[24];
      finishPrim(P);
    }
    memset(acc, 0, sizeof(float) * 3 * W * H);
    for (int y = 0; y < RH; y++) {
      for (int x = 0; x < RW; x++) {
        float u = ((x + 0.5f) / RW * 2.0f - 1.0f) * ((float)W / H);
        float vv = 1.0f - (y + 0.5f) / RH * 2.0f;
        v3 rd = norm(add(add(mul(rt, u), mul(up, vv)), mul(fw, fl)));
        v3 c = render(camPos, rd);
        int o = ((y / SS) * W + (x / SS)) * 3;
        acc[o] += tonemap(c.x);
        acc[o + 1] += tonemap(c.y);
        acc[o + 2] += tonemap(c.z);
      }
    }
    float inv = 1.0f / (SS * SS);
    for (int i = 0; i < W * H * 3; i++) out[i] = (unsigned char)clampf(acc[i] * inv * 255.0f + 0.5f, 0, 255);
    fwrite(out, 1, 3 * W * H, stdout);
    fflush(stdout);
  }
  return 0;
}
