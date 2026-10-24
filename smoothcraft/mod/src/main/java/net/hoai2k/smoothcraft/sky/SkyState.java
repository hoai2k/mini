package net.hoai2k.smoothcraft.sky;

import com.mojang.blaze3d.buffers.Std140Builder;
import net.hoai2k.smoothcraft.SmoothConfig;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.renderer.state.level.SkyRenderState;
import net.minecraft.world.level.CardinalLighting;
import net.minecraft.world.level.dimension.DimensionType;

/**
 * The sun and sky as the shaders see them. Captured from the sky renderer each
 * frame and appended to the Globals uniform block (see globals.glsl):
 * <pre>
 * vec4 SmoothSunDirection;  // xyz towards the sun, w daylight strength 0..1
 * vec4 SmoothSkyColor;      // rgb sky colour, a rain 0..1
 * vec4 SmoothParams;        // x has a sun, y nether shading, z thunder, w lighting on
 * </pre>
 */
public final class SkyState {
	/** Bytes added to the Globals block: three vec4. */
	public static final int EXTRA_BYTES = 48;

	private static float sunX, sunY = 1f, sunZ, daylight = 1f;
	private static float skyR = 0.5f, skyG = 0.7f, skyB = 1f, rain;
	private static float hasSun = 1f, nether, thunder;

	private SkyState() {
	}

	public static void capture(ClientLevel level, float partialTicks, SkyRenderState state) {
		nether = level.cardinalLighting() == CardinalLighting.NETHER ? 1f : 0f;
		rain = level.getRainLevel(partialTicks);
		thunder = level.getThunderLevel(partialTicks);
		if (state.skybox != DimensionType.Skybox.OVERWORLD) {
			hasSun = 0f;
			daylight = 0f;
			return;
		}
		hasSun = 1f;
		// The sky renderer turns the sun by -90 degrees about Y, then by the sun angle about X.
		float a = state.sunAngle;
		sunX = (float) -Math.sin(a);
		sunY = (float) Math.cos(a);
		sunZ = 0f;
		daylight = Math.max(0f, Math.min(1f, sunY * 4f + 0.25f));
		if (state.skyColor != null) {
			skyR = state.skyColor.x();
			skyG = state.skyColor.y();
			skyB = state.skyColor.z();
		}
	}

	public static void write(Std140Builder builder) {
		builder.putVec4(sunX, sunY, sunZ, daylight);
		builder.putVec4(skyR, skyG, skyB, rain);
		builder.putVec4(hasSun, nether, thunder, SmoothConfig.get().realisticLighting ? 1f : 0f);
	}
}
