package net.hoai2k.smoothcraft.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.hoai2k.smoothcraft.entity.RoundedCubes;
import net.minecraft.client.model.geom.ModelPart;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Draws every model box (mobs, players, chests, signs...) as a rounded box. */
@Mixin(ModelPart.Cube.class)
abstract class ModelPartCubeMixin {
	@Inject(method = "compile", at = @At("HEAD"), cancellable = true)
	private void smoothcraft$rounded(PoseStack.Pose pose, VertexConsumer builder, int lightCoords, int overlayCoords, int color, CallbackInfo ci) {
		if (RoundedCubes.render((ModelPart.Cube) (Object) this, pose, builder, lightCoords, overlayCoords, color)) {
			ci.cancel();
		}
	}
}
