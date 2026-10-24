package net.hoai2k.smoothcraft.geom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class FaceBlendTest {
	/** Top faces at y = 0: sand (1) where x < 0, grass (2) elsewhere. */
	static final FaceBlend.Surface SHORE = (x, y, z) -> y != 0 ? -1 : x < 0 ? 1 : 2;

	static float weightOf(FaceBlend.Surface s, int type, float a, float b) {
		int[] types = new int[8];
		float[] weights = new float[8];
		int n = FaceBlend.weigh(s, 1, 0, a, b, types, weights);
		for (int k = 0; k < n; k++) {
			if (types[k] == type) {
				return weights[k];
			}
		}
		return 0;
	}

	@Test
	void straightBorderSitsHalfwayAndFadesAcrossIt() {
		// axis 1 (y): a is z, b is x.
		assertEquals(0.5f, weightOf(SHORE, 1, 3.3f, 0f), 1e-4f);
		assertTrue(weightOf(SHORE, 1, 3.3f, -0.5f) > 0.75f);
		assertTrue(weightOf(SHORE, 1, 3.3f, 0.5f) < 0.25f);
		assertTrue(weightOf(SHORE, 1, 3.3f, -2.5f) > 0.99f);
	}

	@Test
	void weightsSumToOneAndIgnoreUnexposedCells() {
		FaceBlend.Surface mixed = (x, y, z) -> y != 0 ? -1 : (x + z) % 3 == 0 ? -1 : Math.floorMod(x * 7 + z * 3, 4);
		int[] types = new int[8];
		float[] weights = new float[8];
		int n = FaceBlend.weigh(mixed, 1, 0, 0.3f, 0.8f, types, weights);
		float sum = 0;
		for (int k = 0; k < n; k++) {
			sum += weights[k];
		}
		assertEquals(1f, sum, 1e-4f);
	}

	@Test
	void loneBlockStillShowsAtItsCentre() {
		FaceBlend.Surface lone = (x, y, z) -> y != 0 ? -1 : x == 0 && z == 0 ? 1 : 2;
		float centre = weightOf(lone, 1, 0.5f, 0.5f);
		assertTrue(centre > 0.6f, "lone block dominates its own centre: " + centre);
		assertTrue(weightOf(lone, 1, 1f, 1f) < 0.35f, "and its corners round off");
	}

	@Test
	void convexCornerOfAPatchRoundsOff() {
		// Sand fills the quarter x < 0, z < 0; at the patch's corner only a quarter of the area is sand.
		FaceBlend.Surface quarter = (x, y, z) -> y != 0 ? -1 : x < 0 && z < 0 ? 1 : 2;
		float corner = weightOf(quarter, 1, 0f, 0f);
		assertTrue(corner < 0.4f, "the border cuts inside the corner: " + corner);
	}
}
