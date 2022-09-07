const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");
const app = express();
app.use(express.json());

let database = null;
const initializeDbServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error:${error.message}`);
    process.exit(1);
  }
};

initializeDbServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT * FROM state`;

  const statesArray = await database.all(getAllStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
     SELECT * FROM state
     WHERE state_id=${stateId}
    `;
  const state = await database.get(getStateQuery);
  response.send(convertStateDbObjectToResponseObject(state));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `
    INSERT INTO  district (district_name,state_id,cases,cured,active,deaths)
    VALUES('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');
    `;
  await database.run(postDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM district  WHERE district_id=${districtId};`;
  const district = await database.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
    DELETE FROM district WHERE district_id=${districtId};`;
  await database.run(deleteQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateQuery = `
    UPDATE district SET district_name='${districtName}',state_id='${stateId}',cases='${cases}',cured='${cured}',active='${active}',deaths='${deaths}' WHERE district_id='${districtId}'`;
  await database.run(updateQuery);
  response.send("District Details Updated");
});
const DbObjectToResponseObject = (object) => {
  return {
    totalCases: object.total_cases,
    totalCured: object.total_cured,
    totalActive: object.total_active,
    totalDeaths: object.total_deaths,
  };
};

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT SUM(cases) AS total_cases,
            SUM(cured) AS total_cured,
            SUM(active) AS total_active,
            SUM(deaths) AS total_deaths
            FROM district INNER JOIN state ON district.state_id=state.state_id
            WHERE state.state_id=${stateId}
            GROUP BY state.state_name`;
  const stats = await database.get(getStateQuery);
  response.send(DbObjectToResponseObject(stats));
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT state_name FROM state INNER JOIN district ON state.state_id=district.state_id
    WHERE district_id=${districtId}
    `;
  const district = await database.get(getDistrictQuery);
  response.send({ stateName: district.state_name });
});

module.exports = app;
