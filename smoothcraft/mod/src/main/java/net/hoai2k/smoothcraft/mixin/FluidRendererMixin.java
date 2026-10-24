package net.hoai2k.smoothcraft.mixin;

import net.hoai2k.smoothcraft.material.Materials;
import net.minecraft.client.renderer.block.BlockAndTintGetter;
import net.minecraft.client.renderer.block.FluidRenderer;
import net.minecraft.core.BlockPos;
import net.minecraft.tags.FluidTags;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.material.FluidState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyArgs;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.invoke.arg.Args;

/**
 * Fluid quads skip the block models, so tag them here: water or lava material
 * in the alpha, and no normal (the vanilla one always points up, even on the
 * sides), so the shader works the true face normal out itself.
 */
@Mixin(FluidRenderer.class)
abstract class FluidRendererMixin {
	@Unique
	private int smoothcraft$material;

	@Inject(method = "tesselate", at = @At("HEAD"))
	private void smoothcraft$pickMaterial(BlockAndTintGetter level, BlockPos pos, FluidRenderer.Output output, BlockState blockState, FluidState fluidState, CallbackInfo ci) {
		smoothcraft$material = fluidState.is(FluidTags.LAVA) ? Materials.lava() : Materials.water();
	}

	@ModifyArgs(method = "vertex", at = @At(value = "INVOKE", target = "Lcom/mojang/blaze3d/vertex/VertexConsumer;addVertex(FFFIFFIIFFF)V"))
	private void smoothcraft$tagVertex(Args args) {
		args.set(3, Materials.withMaterial(args.<Integer>get(3), smoothcraft$material));
		args.set(8, 0f);
		args.set(9, 0f);
		args.set(10, 0f);
	}
}
