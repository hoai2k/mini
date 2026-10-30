package net.hoai2k.smoothcraft.terrain;

import java.util.Arrays;
import net.hoai2k.smoothcraft.geom.CellField;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.state.BlockState;

/**
 * The cells around the chunk section being meshed, looked up once each.
 * One per meshing thread; it resets itself when handed a new region.
 */
final class RegionCells implements CellField {
	private static final int MARGIN = 4;
	private static final int SIZE = 16 + 2 * MARGIN;
	private static final ThreadLocal<RegionCells> CURRENT = ThreadLocal.withInitial(RegionCells::new);

	private final byte[] cells = new byte[SIZE * SIZE * SIZE];
	private final BlockState[] states = new BlockState[SIZE * SIZE * SIZE];
	private final BlockPos.MutableBlockPos scratch = new BlockPos.MutableBlockPos();
	private BlockGetter level;
	private int baseX, baseY, baseZ;

	static RegionCells of(BlockGetter level, BlockPos pos) {
		RegionCells cells = CURRENT.get();
		int bx = (pos.getX() & ~15) - MARGIN, by = (pos.getY() & ~15) - MARGIN, bz = (pos.getZ() & ~15) - MARGIN;
		if (cells.level != level || cells.baseX != bx || cells.baseY != by || cells.baseZ != bz) {
			cells.level = level;
			cells.baseX = bx;
			cells.baseY = by;
			cells.baseZ = bz;
			Arrays.fill(cells.cells, (byte) 0);
			Arrays.fill(cells.states, null);
		}
		return cells;
	}

	/** Forget the region so it can be collected. */
	static void release() {
		CURRENT.get().level = null;
	}

	/** The block kind including {@link BlockRules#FOLLOW}. */
	byte kind(int x, int y, int z) {
		int lx = x - baseX, ly = y - baseY, lz = z - baseZ;
		if (lx < 0 || ly < 0 || lz < 0 || lx >= SIZE || ly >= SIZE || lz >= SIZE) {
			return BlockRules.kind(level.getBlockState(scratch.set(x, y, z)));
		}
		int i = (lx * SIZE + ly) * SIZE + lz;
		byte k = cells[i];
		if (k == 0) {
			k = (byte) (BlockRules.kind(level.getBlockState(scratch.set(x, y, z))) + 1);
			cells[i] = k;
		}
		return (byte) (k - 1);
	}

	BlockState state(int x, int y, int z) {
		int lx = x - baseX, ly = y - baseY, lz = z - baseZ;
		if (lx < 0 || ly < 0 || lz < 0 || lx >= SIZE || ly >= SIZE || lz >= SIZE) {
			return level.getBlockState(scratch.set(x, y, z));
		}
		int i = (lx * SIZE + ly) * SIZE + lz;
		BlockState state = states[i];
		if (state == null) {
			state = level.getBlockState(scratch.set(x, y, z));
			states[i] = state;
		}
		return state;
	}

	BlockGetter level() {
		return level;
	}

	@Override
	public byte cell(int x, int y, int z) {
		byte k = kind(x, y, z);
		return k == BlockRules.FOLLOW ? EMPTY : k;
	}
}
