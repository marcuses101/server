const express = require("express");
const { ItemServices } = require("./item-services");
const xss = require("xss");
const ItemRouter = express.Router();

function serializeItem(item) {
  const { name, description } = item;
  return {
    ...item,
    name: xss(name),
    description: xss(description),
  };
}

ItemRouter.route("/")
  .get(async (req, res, next) => {
    try {
      const { project_id, acquisition_id, scene_id } = req.query;
      const numberOfQueries = [project_id, acquisition_id, scene_id].reduce(
        (total, current) => (current ? ++total : total),
        0
      );
      if (numberOfQueries !== 1)
        return res.status(400).json({
          error: {
            message:
              "ONE of 'project_id', 'acquisition_id', 'scene_id',  is required",
          },
        });
      if (acquisition_id) {
        const items = await ItemServices.getAcquisitionItems(
          req.app.get("db"),
          acquisition_id
        );
        return res.json(items);
      }
      if (scene_id) {
        const items = await ItemServices.getSceneItems(
          req.app.get('db'),
          scene_id
        );
        return res.json(items);
      }
      const items = await ItemServices.getProjectItems(
        req.app.get("db"),
        project_id
      );
      res.json(items);
    } catch (error) {
      next(error);
    }
  })
  .post(async (req, res, next) => {
    try {
      const {
        project_id,
        name,
        description,
        acquired,
        acquisition_id,
        quantity,
      } = req.body;
      if (!project_id || !name)
        return res
          .status(400)
          .json({ error: { message: "project_id and name are required" } });
      const item = {
        project_id,
        name,
        description,
        acquired,
        acquisition_id,
        quantity,
      };
      const databaseItem = await ItemServices.addItem(req.app.get("db"), item);
      res
        .status(201)
        .location(`${req.baseUrl}/${databaseItem.id}`)
        .json(serializeItem(databaseItem));
    } catch (error) {
      next(error);
    }
  });

ItemRouter.route("/:item_id")
  .all(async (req, res, next) => {
    try {
      const { item_id } = req.params;
      const item = await ItemServices.getItemById(req.app.get("db"), item_id);
      if (!item)
        return res
          .status(400)
          .json({ error: { message: `item with id ${item_id} not found` } });
      req.item = item;
      next();
    } catch (error) {
      next(error);
    }
  })
  .get((req, res) => {
    res.json(serializeItem(req.item));
  })
  .patch(async (req, res, next) => {
    try {
      const { item_id } = req.params;
      const {
        name,
        description,
        quantity,
        acquisition_id,
        acquired
      } = req.body;
      const bodyItem = {
        name,
        description,
        quantity,
        acquisition_id,
        acquired
      };
      if (!Object.values(bodyItem).some(Boolean)) {
        return res.status(400).json({
          error: {
            message:
              "Minimum one of the following properties is required: name, description, quantity, acquisition_id, acquired",
          },
        });
      }
      const updatedItem = await ItemServices.updateItem(
        req.app.get("db"),
        item_id,
        bodyItem
      );
      res.status(200).json(serializeItem(updatedItem));
    } catch (error) {
      next(error);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const { item_id } = req.params;
      await ItemServices.removeItem(req.app.get("db"), item_id);
      res.status(200).json({message:`item with id: ${item_id} removed`})
    } catch (error) {
      next(error);
    }
  });

module.exports = { ItemRouter };
