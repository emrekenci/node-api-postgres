const express        = require('express');
const azure          = require('azure-sb');
const app            = express();
const port           = 5001;
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

if (!process.env.POSTGRES_CONNECTION_STRING) {
    console.error("POSTGRES_CONNECTION_STRING environment variable must be set")
    process.exit(-1);
}

const serviceBusClient = azure.createServiceBusService();

const postGresClient   = new Client(process.env.POSTGRES_CONNECTION_STRING)

app.use(express.json()) 

app.listen(port, async () => {

    await postGresClient.connect((err) => {
        if (err) {
            console.log(err)
          } else {
            console.log("All good, connected to db... Listening on port: " + port)
          }
    })
});

app.get('', (req,res) => {
    return res.send("ok")
});

app.put('/messages/normal', async (req, res) => {

    var event_id = uuid()

    var event_data = req.body

    var sql = 'INSERT INTO events(event_id,event_data) VALUES ($1,$2)';
    var values = [event_id,JSON.stringify(event_data)];

    var response = {
        id: event_id,
    }

    await postGresClient.query(sql, values,(err) => {
        if (!err) {
            res.setHeader('Content-Type', 'application/json')
            return res.send(response)
        } else {
            console.error("Error writing to DB:" + err.stack)
            console.error("Writing the message to service bus queue")
            serviceBusClient.sendQueueMessage(queueName, message, function(error){
                    if(!error){
                        return res.send(response)
                    }
                    else {
                        console.error("Error writing message to queue: " + error)
                        return res.status(500).send('Something went wrong')
                    }
                });
        }
      })
});