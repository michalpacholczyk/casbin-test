const express = require('express');
const {authorize} = require('./authorization');

const app = express();

// Use authorization middleware
app.use('/playchannel/:channelId/:quality/:action', authorize);

// Request handler
app.post('/playchannel/:channelId/:quality/:action', (req, res) => {
    res.json({message: 'You are authorized!'});
});

const server = app.listen(3000, () => console.log('Server ready'));
