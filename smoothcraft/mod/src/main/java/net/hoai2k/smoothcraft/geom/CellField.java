package net.hoai2k.smoothcraft.geom;

/**
 * The voxel grid the smooth surface is built from, one value per block cell.
 * Cell (x, y, z) fills the unit cube from (x, y, z) to (x + 1, y + 1, z + 1).
 */
public interface CellField {
	/** Nothing to smooth against: air, plants, torches. */
	byte EMPTY = 0;
	/** Natural terrain the surface flows over. */
	byte SMOOTH = 1;
	/** Built or otherwise solid blocks that keep their shape: corners touching one never move. */
	byte HARD = 2;
	/** Water and lava: open space for the surface, so lake and sea beds smooth like dry ground. */
	byte FLUID = 3;

	byte cell(int x, int y, int z);

	static boolean solid(byte cell) {
		return cell == SMOOTH || cell == HARD;
	}
}
