'use strict';

require('dotenv').config();
const smartcar = require('smartcar');
const express = require('express');
const session = require('cookie-session');
const url = require('url');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
var app = express();

app.use(session({
    name: 'smartcarproj',
    secret: 'smartcarproj-super-secret-secret'
}))
app.use(bodyParser.urlencoded({
    extended: false
}));
app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
}));
app.set('view engine', '.hbs');

const port = process.env.PORT;

const client = new smartcar.AuthClient({
    clientId: `${process.env.CLIENTID}`,
    clientSecret: `${process.env.CLIENTSECRET}`,
    redirectUri: `http://localhost:${process.env.PORT}/callback`,
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
            req.session = {};
            req.session.vehicles = {};
            req.session.access = access;
            return res.redirect('/vehicles');
        })
});

app.get('/vehicles', (req, res, next) => {
    const { access, vehicles } = req.session;
    if (!access) {
        return res.redirect('/login');
    }
    const { accessToken } = access;
    smartcar.getVehicleIds(accessToken)
        .then((data) => {
            const vehicleIds = data.vehicles;
            const vehiclePromises = vehicleIds.map(vehicleId => {
                const vehicle = new smartcar.Vehicle(vehicleId, accessToken);
                req.session.vehicles[vehicleId] = {
                    id: vehicleId,
                };
                return vehicle.info();
            });

            return Promise.all(vehiclePromises)
                .then((data) => {
                    data.map(vehicle => {
                        const { id: vehicleId } = vehicle;
                        req.session.vehicles[vehicleId] = vehicle;
                    })
                    res.render('vehicles', { vehicles: req.session.vehicles });

                })
                .catch((err) => {
                    const message = err.message || 'Failed to get vehicle info';
                    const action = 'fetching vehicle info';
                    return redirectToError(res, message, action);
                });
        })
})

app.post('/request', (req, res, next) => {
    const { access, vehicles } = req.session;
    if (!access) {
        return res.redirect('/login');
    }

    const { vehicleId, requestType: type } = req.body;
    const vehicle = vehicles[vehicleId];
    const instance = new smartcar.Vehicle(vehicleId, access.AccessToken);

    let data = null;

    switch (type) {
        case 'info':
            instance.info()
                .then(data => res.render('data', { data, type, vehicle }))
                .catch(function (err) {
                    const message = err.message || 'Failed to get vehicle info.';
                    const action = 'fetching vehicle info';
                    return redirectToError(res, message, action);
                });
            break;
        case 'lock':
            instance.lock()
                .then(() => {
                    res.render('data', {
                        data: {
                            action: 'Lock request sent.',
                        },
                        type,
                        vehicle,
                    });
                })
                .catch((err) => {
                    const message = err.message || 'Failed to send lock request to vehicle.'
                    const action = 'locking vehicle';
                    return redirectToError(res, message, action);
                });
            break;
        case 'unlock':
            instance.unlock()
                .then(() => {
                    res.render('data', {
                        vehicle,
                        type,

                        data: {
                            action: 'Unlock request sent.',
                        },
                    });
                })
                .catch((err) => {
                    const message = err.message || 'Failed to send unlock request to vehicle.'
                    const action = 'unlocking vehicle';
                    return redirectToError(res, message, action);
                });
            break;
        default:
            return redirectToError(
                res,
                `Failed to find request type ${requestType}`,
                'sending request to vehicle'
            );
    }
})


const redirectToError = (res, message, action) => res.redirect(url.format({
    pathname: '/error',
    query: { message, action },
}));


app.get('/error', function (req, res, next) {

    const { action, message } = req.query;
    if (!action && !message) {
        return res.redirect('/');
    }

    res.render('error', { action, message });

});

app.listen(port, () => console.log(`server running on port: ${port}`));