LIBRARY({
	name: "TileRender",
	version: 18,
	shared: true,
	api: "CoreEngine"
});

let EntityGetYaw = ModAPI.requireGlobal("Entity.getYaw");
let EntityGetPitch = ModAPI.requireGlobal("Entity.getPitch");

let TileRenderer = {
	data: {},
	
	createBlockModel: function(id, data, boxes) {
		let render = new ICRender.Model();
		let model = BlockRenderer.createModel();
		for(let i in boxes) {
			var box = boxes[i];
			model.addBox(box[0], box[1], box[2], box[3], box[4], box[5], id, data);
		}
		render.addEntry(model);
		return render;
	},

	setCollisionShape: function(id, data, boxes){
		let shape = new ICRender.CollisionShape();
		for(let i in boxes) {
			var box = boxes[i];
			let entry = shape.addEntry();
			entry.addBox(box[0], box[1], box[2], box[3], box[4], box[5]);
		}
		BlockRenderer.setCustomCollisionShape(id, data, shape);
	},

	setStandardModel: function(id, data, texture) {
		let render = new ICRender.Model();
		let model = BlockRenderer.createTexturedBlock(texture);
		render.addEntry(model);
		BlockRenderer.enableCoordMapping(id, data, render);
	},

	setStandardModelWithRotation: function(id, data, texture, hasVertical) {
		let variations = [
			[texture[3], texture[2], texture[0], texture[1], texture[4], texture[5]],
			[texture[2], texture[3], texture[1], texture[0], texture[5], texture[4]],
			[texture[0], texture[1], texture[3], texture[2], texture[5], texture[4]],
			[texture[0], texture[1], texture[2], texture[3], texture[4], texture[5]],
			[texture[0], texture[1], texture[4], texture[5], texture[3], texture[2]],
			[texture[0], texture[1], texture[5], texture[4], texture[2], texture[3]],
		]
		let startIndex = hasVertical ? 0 : 2;
		for(let i = startIndex; i < 6; i++) {
			this.setStandardModel(id, data + i - startIndex, variations[i]);
		}
		if (hasVertical) {
			let render = new ICRender.Model();
			let model = BlockRenderer.createTexturedBlock(variations[3]);
			render.addEntry(model);
			ItemModel.getFor(id, data).setHandModel(model);
			ItemModel.getFor(id, data).setUiModel(model);
		}
	},

	// deprecated
	setStandartModel: function(id, texture, data) {
		this.setStandardModel(id, data || 0, texture)
	},
	
	registerRenderModel: function(id, data, texture) {
		let render = new ICRender.Model();
		let model = BlockRenderer.createTexturedBlock(texture);
		render.addEntry(model);
		if (!this.data[id]) this.data[id] = {};
		this.data[id][data] = render;
	},

	registerModelWithRotation: function(id, data, texture, hasVertical) {
		let variations = [
			[texture[3], texture[2], texture[0], texture[1], texture[4], texture[5]],
			[texture[2], texture[3], texture[1], texture[0], texture[5], texture[4]],
			[texture[0], texture[1], texture[3], texture[2], texture[5], texture[4]],
			[texture[0], texture[1], texture[2], texture[3], texture[4], texture[5]],
			[texture[0], texture[1], texture[4], texture[5], texture[3], texture[2]],
			[texture[0], texture[1], texture[5], texture[4], texture[2], texture[3]]
		]
		let startIndex = hasVertical ? 0 : 2;
		for(let i = startIndex; i < 6; i++) {
			this.registerRenderModel(id, data + i - startIndex, variations[i]);
		}
	},

	// deprecated
	registerRotationModel: function(id, data, texture) {
		this.registerModelWithRotation(id, data, texture);
	},
	
	// deprecated
	registerFullRotationModel: function(id, data, texture) {
		if (texture.length == 2) {
			for(let i = 0; i < 6; i++) {
				let textures = [];
				for(let j = 0; j < 6; j++) {
					if (j == i) textures.push(texture[1]);
					else textures.push(texture[0]);
				}
				this.registerRenderModel(id, i + data, textures);
			}
		} else {
			this.registerModelWithRotation(id, data, texture, true);
		}
	},
	
	getRenderModel: function(id, data) {
		let models = this.data[id];
		if (models) {
			return models[data];
		}
		return null;
	},
	
	mapAtCoords: function(x, y, z, id, data) {
		let model = this.getRenderModel(id, data);
		if (model) {
			BlockRenderer.mapAtCoords(x, y, z, model);
		}
	},
	
	getBlockRotation: function(hasVertical) {
		let pitch = EntityGetPitch(Player.get());
		if (hasVertical) {
			if (pitch < -45) return 0;
			if (pitch > 45) return 1;
		}
		let rotation = Math.floor((EntityGetYaw(Player.get()) - 45)%360 / 90);
		if (rotation < 0) rotation += 4;
		rotation = [5, 3, 4, 2][rotation];
		return rotation;
	},

	setRotationFunction(id, hasVertical, placeSound) {
		Block.registerPlaceFunction(id, function(coords, item, block) {
			let place = World.canTileBeReplaced(block.id, block.data) ? coords : coords.relative;
			let rotation = TileRenderer.getBlockRotation(hasVertical);
			World.setBlock(place.x, place.y, place.z, item.id, rotation);
			World.playSound(place.x, place.y, place.z, placeSound || "dig.stone", 1, 0.8);
			return place;
		});
	},

	setRotationPlaceFunction: function(id, hasVertical, placeSound) {
		Block.registerPlaceFunction(id, function(coords, item, block) {
			let place = World.canTileBeReplaced(block.id, block.data) ? coords : coords.relative;
			World.setBlock(place.x, place.y, place.z, item.id, 0);
			World.playSound(place.x, place.y, place.z, placeSound || "dig.stone", 1, 0.8)
			let rotation = TileRenderer.getBlockRotation(hasVertical);
			if (!hasVertical) rotation -= 2;
			let tile = World.addTileEntity(place.x, place.y, place.z);
			tile.data.meta = rotation;
			TileRenderer.mapAtCoords(place.x, place.y, place.z, item.id, rotation);
			return place;
		});
	},

	setupWireModel: function(id, data, width, groupName, preventSelfAdd) {
		let render = new ICRender.Model();
		let shape = new ICRender.CollisionShape();

		let group = ICRender.getGroup(groupName);
		if (!preventSelfAdd) {
			group.add(id, data);
		}
		
		// connections
		width /= 2;
		let boxes = [
			{side: [1, 0, 0], box: [0.5 + width, 0.5 - width, 0.5 - width, 1, 0.5 + width, 0.5 + width]},
			{side: [-1, 0, 0], box: [0, 0.5 - width, 0.5 - width, 0.5 - width, 0.5 + width, 0.5 + width]},
			{side: [0, 1, 0], box: [0.5 - width, 0.5 + width, 0.5 - width, 0.5 + width, 1, 0.5 + width]},
			{side: [0, -1, 0], box: [0.5 - width, 0, 0.5 - width, 0.5 + width, 0.5 - width, 0.5 + width]},
			{side: [0, 0, 1], box: [0.5 - width, 0.5 - width, 0.5 + width, 0.5 + width, 0.5 + width, 1]},
			{side: [0, 0, -1], box: [0.5 - width, 0.5 - width, 0, 0.5 + width, 0.5 + width, 0.5 - width]},
		]
		
		for (let i in boxes) {
			let box = boxes[i];
			// render
			let model = BlockRenderer.createModel();
			model.addBox(box.box[0], box.box[1], box.box[2], box.box[3], box.box[4], box.box[5], id, data);
			let condition = ICRender.BLOCK(box.side[0], box.side[1], box.side[2], group, false);
			render.addEntry(model).setCondition(condition);
			// collision shape
			let entry = shape.addEntry();
			entry.addBox(box.box[0], box.box[1], box.box[2], box.box[3], box.box[4], box.box[5]);
			entry.setCondition(condition);
		}
		
		// central box
		let model = BlockRenderer.createModel();
		model.addBox(0.5 - width, 0.5 - width, 0.5 - width, 0.5 + width, 0.5 + width, 0.5 + width, id, data);
		render.addEntry(model);
		
		let entry = shape.addEntry();
		entry.addBox(0.5 - width, 0.5 - width, 0.5 - width, 0.5 + width, 0.5 + width, 0.5 + width);
		
		width = Math.max(width, 0.25);
		Block.setShape(id, 0.5 - width, 0.5 - width, 0.5 - width, 0.5 + width, 0.5 + width, 0.5 + width, data);
		
		BlockRenderer.setStaticICRender(id, data, render);
		BlockRenderer.setCustomCollisionShape(id, data, shape);
	},

	setEmptyCollisionShape: function(id) {
		let shape = new ICRender.CollisionShape();
		shape.addEntry().addBox(1, 1, 1, 0, 0, 0);
		BlockRenderer.setCustomCollisionShape(id, -1, shape);
	},

	getCropModel: function(texture) {
        let render = this.createBlockModel(texture[0], texture[1], [
			[0.25, 0, 0, 0.25, 1, 1],
			[0.75, 0, 0, 0.75, 1, 1],
			[0, 0, 0.25, 1, 1, 0.25],
			[0, 0, 0.75, 1, 1, 0.75]
		]);
        return render;
    },

	// deprecated and not supported
	// use render types instead
	setPlantModel: function(){},
	setCropModel: function(){},
	// use BaseBlocks library instead
	setSlabShape: function() {},
	setSlabPlaceFunction: function() {}
}

EXPORT("TileRenderer", TileRenderer);