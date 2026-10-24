package net.hoai2k.smoothcraft.mixin;

import com.mojang.blaze3d.buffers.Std140Builder;
import java.nio.ByteBuffer;
import net.hoai2k.smoothcraft.sky.SkyState;
import net.minecraft.client.renderer.GlobalSettingsUniform;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.Redirect;

/** Grows the Globals uniform block by the sun and sky values in {@link SkyState}. */
@Mixin(GlobalSettingsUniform.class)
abstract class GlobalSettingsUniformMixin {
	@ModifyArg(method = "<init>", at = @At(value = "INVOKE", target = "Lcom/mojang/renderpearl/api/device/GpuDevice;createBuffer(Ljava/util/function/Supplier;IJ)Lcom/mojang/renderpearl/api/buffers/GpuBuffer;"), index = 2)
	private long smoothcraft$growBuffer(long size) {
		return size + SkyState.EXTRA_BYTES;
	}

	@ModifyArg(method = "update", at = @At(value = "INVOKE", target = "Lcom/mojang/blaze3d/buffers/Std140Builder;onStack(Lorg/lwjgl/system/MemoryStack;I)Lcom/mojang/blaze3d/buffers/Std140Builder;"), index = 1)
	private int smoothcraft$growData(int size) {
		return size + SkyState.EXTRA_BYTES;
	}

	@Redirect(method = "update", at = @At(value = "INVOKE", target = "Lcom/mojang/blaze3d/buffers/Std140Builder;get()Ljava/nio/ByteBuffer;"))
	private ByteBuffer smoothcraft$appendSky(Std140Builder builder) {
		SkyState.write(builder);
		return builder.get();
	}
}
