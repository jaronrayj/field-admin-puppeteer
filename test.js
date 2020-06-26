const axios = require('axios');
const token = process.env.TOKEN

const instance = axios.create({
    baseURL: 'https://jjohnson.instructure.com/api/v1',
    timeout: 1000,
    headers: { 'Authorization': `Bearer ${token}` }
});

instance.get('/courses/8')
    .then(response => {
        console.log(response.data);
    })

