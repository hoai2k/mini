package net.hoai2k.smoothcraft.mixin;

import java.util.List;
import java.util.Map;
import net.hoai2k.smoothcraft.entity.RoundedCubes;
import net.minecraft.client.model.geom.ModelPart;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Lets {@link RoundedCubes} see which boxes of a part touch, so their joins stay sharp. */
@Mixin(ModelPart.class)
abstract class ModelPartMixin {
	@Inject(method = "<init>", at = @At("RETURN"))
	private void smoothcraft$noteJoins(List<ModelPart.Cube> cubes, Map<String, ModelPart> children, CallbackInfo ci) {
		RoundedCubes.registerPart(cubes);
	}
}
