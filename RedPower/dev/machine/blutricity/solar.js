IDRegistry.genBlockID("rp_solar");
Block.createBlock("rp_solar", [
	{name: "Solar Panel", texture: [["rp_machine_bottom", 0], ["rp_solar", 0], ["rp_solar", 1], ["rp_solar", 1], ["rp_solar", 1], ["rp_solar", 1]], inCreative: true}
], "stone_slab");
ToolAPI.registerBlockMaterial(BlockID.rp_solar, "stone", 1);
Block.setDestroyLevel("rp_solar", 1);
Block.setBlockShape(BlockID.rp_solar, {x: 0, y: 0, z: 0}, {x: 1, y: 0.25, z: 1}, 0);

Callback.addCallback("PreLoaded", function() {
	Recipes.addShaped({id: BlockID.rp_solar, count: 1, data: 0}, [
		"ooo",
		"oxo",
		"ooo"
	], ['x', ItemID.ingotBlue, 0, 'o', ItemID.waferBlue, 0]);
});


MachineRegistry.registerPrototype(BlockID.rp_solar, {
	isGenerator: function() {
		return true;
	},
	
	energyTick: function(type, src) {
		if (World.getBlockID(this.x, this.y + 1, this.z) != BlockID.luminator && World.getLightLevel(this.x, this.y + 1, this.z) == 15) {
			src.add(2);
		}
	}
});
