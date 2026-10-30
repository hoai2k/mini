package net.hoai2k.smoothcraft.geom;

/**
 * Where two kinds of terrain meet on the surface (grass and sand, sand and
 * gravel, stone and dirt), the border should wander and curve instead of
 * following the block grid. This gives every point of a face how much of each
 * surface type surrounds it, from the exposed faces in the same plane: a
 * blend of a tight bilinear kernel (so a lone block still shows) and a wide
 * cubic B-spline (so borders and corners round off). The result is a
 * function of position alone, so neighbouring blocks agree along their
 * shared edges; the shader turns the weights into a crisp, noise-wobbled
 * border.
 */
public final class FaceBlend {
	/** Share of the wide cubic kernel; the rest is bilinear. */
	private static final float WIDE = 0.5f;

	/** The surface type of a cell's exposed face in the plane being blended, or -1 for none. */
	@FunctionalInterface
	public interface Surface {
		int type(int x, int y, int z);
	}

	private FaceBlend() {
	}

	/**
	 * Weighs the surface types around a point of a face.
	 *
	 * @param axis    the face's normal axis (0 x, 1 y, 2 z)
	 * @param layer   the cell coordinate along that axis (the block's own)
	 * @param a       the point's coordinate along axis + 1
	 * @param b       the point's coordinate along axis + 2
	 * @param types   receives the distinct types
	 * @param weights receives their weights, summing to 1
	 * @return how many types were found (0 when no exposed faces are near)
	 */
	public static int weigh(Surface surface, int axis, int layer, float a, float b, int[] types, float[] weights) {
		int n = 0;
		float total = 0;
		// Tight kernel: bilinear over the 2x2 nearest cell centres.
		int a0 = floor(a - 0.5f), b0 = floor(b - 0.5f);
		float ta = a - 0.5f - a0, tb = b - 0.5f - b0;
		for (int i = 0; i <= 1; i++) {
			for (int j = 0; j <= 1; j++) {
				float w = (i == 0 ? 1 - ta : ta) * (j == 0 ? 1 - tb : tb) * (1 - WIDE);
				n = add(surface, axis, layer, a0 + i, b0 + j, w, types, weights, n);
			}
		}
		// Wide kernel: cubic B-spline over the 4x4 nearest.
		float[] wa = new float[4], wb = new float[4];
		int ia = cubic(a, wa), ib = cubic(b, wb);
		for (int i = 0; i < 4; i++) {
			for (int j = 0; j < 4; j++) {
				n = add(surface, axis, layer, ia + i, ib + j, wa[i] * wb[j] * WIDE, types, weights, n);
			}
		}
		for (int k = 0; k < n; k++) {
			total += weights[k];
		}
		if (total <= 1e-6f) {
			return 0;
		}
		for (int k = 0; k < n; k++) {
			weights[k] /= total;
		}
		return n;
	}

	private static int add(Surface surface, int axis, int layer, int ca, int cb, float w, int[] types, float[] weights, int n) {
		if (w <= 0) {
			return n;
		}
		int[] c = new int[3];
		c[axis] = layer;
		c[(axis + 1) % 3] = ca;
		c[(axis + 2) % 3] = cb;
		int type = surface.type(c[0], c[1], c[2]);
		if (type < 0) {
			return n;
		}
		for (int k = 0; k < n; k++) {
			if (types[k] == type) {
				weights[k] += w;
				return n;
			}
		}
		if (n == types.length) {
			return n;
		}
		types[n] = type;
		weights[n] = w;
		return n + 1;
	}

	/** Uniform cubic B-spline weights over cells i .. i+3 around x (returns i). */
	private static int cubic(float x, float[] w) {
		float u = x - 0.5f;
		int i = floor(u);
		float t = u - i, s = 1 - t, t2 = t * t, t3 = t2 * t;
		w[0] = s * s * s / 6f;
		w[1] = (3 * t3 - 6 * t2 + 4) / 6f;
		w[2] = (-3 * t3 + 3 * t2 + 3 * t + 1) / 6f;
		w[3] = t3 / 6f;
		return i - 1;
	}

	private static int floor(float v) {
		int i = (int) v;
		return v < i ? i - 1 : i;
	}
}
