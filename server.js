const express        = require('express');
const azure          = require('azure-sb');
const app            = express();
const port           = 5000;
const uuid           = require('uuid/v4');
const { Client }     = require('pg')

if (!process.env.AZURE_SERVICEBUS_CONNECTION_STRING) {
    console.error("AZURE_SERVICEBUS_CONNECTION_STRING environment variable must be set")
    process.exit(-1);
}

if (!process.env.AZURE_SERVICEBUS_QUEUE_NAME) {
    console.error("AZURE_SERVICEBUS_QUEUE_NAME environment variable must be set")
    process.exit(-1);
}

if (!process.env.AZURE_SERVICEBUS_TOPIC_NAME) {
    console.error("AZURE_SERVICEBUS_TOPIC_NAME environment variable must be set")
    process.exit(-1);
}

if (!process.env.POSTGRES_CONNECTION_STRING) {
    console.error("POSTGRES_CONNECTION_STRING environment variable must be set")
    process.exit(-1);
}

const serviceBusClient = azure.createServiceBusService();

const postGresClient   = new Client(process.env.POSTGRES_CONNECTION_STRING)

// JSON middleware for API
app.use(express.json()) 

// Startup express
app.listen(port, async () => {

    await postGresClient.connect((err) => {
        if (err) {
            console.log(err)
            process.exit(-1)
          } else {
            console.log("All good, connected to db... Listening on port: " + port)
          }
    })
});

// Healthcheck endpoint
app.get('/', (req,res) => {
    return res.send("ok")
});

// Message endpoint
app.put('/messages/normal', async (req, res) => {

    var event_id = uuid()

    var event_data = req.body

    // Asyncronously send the message to topic
    sendToTopic(req.body);

    var sql = 'INSERT INTO events(event_id,event_data) VALUES ($1,$2)';
    var values = [event_id,JSON.stringify(event_data)];

    var response = {
        id: event_id,
    }

    // Syncronously write the message to the db
    await postGresClient.query(sql, values,(err) => {
        if (!err) {
            res.setHeader('Content-Type', 'application/json')
            return res.send(response)
        } else {
            console.error("Error writing to DB:" + err.stack)
            console.error("Writing the message to service bus queue")
            return res.status(500).send('Something went wrong')
        }
      })
});

// Send message to SB topic
function sendToTopic(message){
    serviceBusClient.sendTopicMessage(process.env.AZURE_SERVICEBUS_TOPIC_NAME,message, function(error) {
        if(error){
            console.log("Error writing message to topic: " + error)
        }
     })
}