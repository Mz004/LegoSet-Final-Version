require("dotenv").config();
const Sequelize = require("sequelize");

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

const Theme = sequelize.define("Theme", {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

const Set = sequelize.define("Set", {
  set_num: {
    type: Sequelize.STRING,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  year: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  num_parts: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  theme_id: {
    type: Sequelize.INTEGER,
    references: {
      model: Theme,
      key: 'id',
    },
  },
  img_url: {
    type: Sequelize.STRING,
    allowNull: true,
  },
});

Set.belongsTo(Theme, { foreignKey: "theme_id" });

async function initialize() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    await sequelize.sync();
    console.log("Database synchronized successfully.");
  } catch (error) {
    console.error('Error initializing database:', error);
    throw new Error('Database initialization failed');
  }
}

async function getAllSets() {
  try {
    const sets = await Set.findAll({ include: [Theme] });
    return sets;
  } catch (error) {
    console.error("Error getting all sets:", error);
    throw new Error('Could not fetch sets');
  }
}

async function getSetByNum(setNum) {
  try {
    const set = await Set.findOne({
      where: { set_num: setNum },
      include: [Theme],
    });
    if (set) {
      return set;
    } else {
      throw new Error(`Set not found with set_num: ${setNum}`);
    }
  } catch (error) {
    console.error("Error getting set by set_num:", error);
    throw new Error('Could not fetch the set');
  }
}

async function getSetsByTheme(theme) {
  try {
    const sets = await Set.findAll({
      include: [Theme],
      where: {
        "$Theme.name$": {
          [Sequelize.Op.iLike]: `%${theme}%`,
        },
      },
    });

    if (sets.length > 0) {
      return sets;
    } else {
      throw new Error(`No sets found for theme: ${theme}`);
    }
  } catch (error) {
    console.error("Error getting sets by theme:", error);
    throw new Error('Could not fetch sets by theme');
  }
}

async function addSet(setData) {
  try {
    const newSet = await Set.create(setData);
    return newSet;
  } catch (error) {
    console.error('Error adding set:', error);
    throw new Error('Error adding set');
  }
}

async function getAllThemes() {
  try {
    const themes = await Theme.findAll();
    return themes;
  } catch (error) {
    console.error('Error fetching themes:', error);
    throw new Error('Error fetching themes');
  }
}

async function editSet(set_num, setData) {
  try {
    const set = await Set.findOne({ where: { set_num } }); 
    if (set) {
      await set.update(setData);
      console.log('Set updated successfully');
      return set;
    } else {
      throw new Error(`Set with set number ${set_num} not found`);
    }
  } catch (error) {
    console.error('Error updating set:', error);
    throw new Error('Error updating set');
  }
}

async function deleteSet(setNum) {
  try {
    const deletedSetCount = await Set.destroy({ where: { set_num: setNum } });
    if (deletedSetCount === 0) {
      throw new Error('Set not found');
    }
  } catch (error) {
    console.error('Error deleting set:', error);
    throw new Error('Error deleting set');
  }
}

module.exports = {
  initialize,
  getAllSets,
  getSetByNum,
  getSetsByTheme,
  addSet,
  getAllThemes,
  editSet,
  deleteSet,
};
