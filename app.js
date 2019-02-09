'use strict';

require('dotenv').config();
const smartcar = require('smartcar');
const express = require('express');
var app = express();

const port = process.env.PORT;

const client = new smartcar.AuthClient({
    clientId: `${process.env.CLIENTID}`,
    clientSecret: `${process.env.CLIENTSECRET}`,
    redirectUri: `http://localhost:${process.env.PORT}/callback`,
    scope: ['read_vehicle_info'],
    testMode: true,
});

app.get('/login', (req, res) => {
    const link = client.getAuthUrl({});
    res.redirect(link);
});

app.get('/callback', (req, res, next) => {
    let access;

    if (req.query.error) {
        return next(new Error(req.query.error));
    }

    return client.exchangeCode(req.query.code)
        .then((_access) => {
            access = _access;
            return smartcar.getVehicleIds(access.accessToken);
        })
        .then((res) => {
            const vehicle = new smartcar.Vehicle(res.vehicles[0], access.accessToken);
            return vehicle.info();
        })
        .then((data) => {
            console.log(data);
            res.json(data);
        });
});

app.get('/hello', (req, res, next) => {
    let access;

    if (req.query.error) {
        return next(new Error(req.query.error));
    }

    return client.exchangeCode(req.query.code)
        .then((_access) => {
            access = _access;
            return smartcar.getVehicleIds(access.accessToken);
        })
        .then((res) => {
            const vehicle = new smartcar.Vehicle(res.vehicles[0], access.accessToken);
            return vehicle.info();
        })
        .then((data) => {
            console.log(data);
            res.json(data);
        });
});

app.listen(port, () => console.log(`server running on port: ${port}`));