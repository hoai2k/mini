package net.hoai2k.smoothcraft.mixin;

import com.llamalad7.mixinextras.sugar.Local;
import com.mojang.blaze3d.vertex.BufferBuilder;
import net.hoai2k.smoothcraft.geom.NormalPacking;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/** Terrain vertices have no normal attribute; carry the normal in the lightmap coordinate's spare bits. */
@Mixin(BufferBuilder.class)
abstract class BufferBuilderMixin {
	@Shadow
	@Final
	private boolean blockFormat;

	@ModifyVariable(method = "addVertex(FFFIFFIIFFF)V", at = @At("HEAD"), argsOnly = true, ordinal = 2)
	private int smoothcraft$packNormal(int lightCoords,
			@Local(argsOnly = true, ordinal = 5) float nx,
			@Local(argsOnly = true, ordinal = 6) float ny,
			@Local(argsOnly = true, ordinal = 7) float nz) {
		return blockFormat ? NormalPacking.pack(lightCoords, nx, ny, nz) : lightCoords;
	}
}
