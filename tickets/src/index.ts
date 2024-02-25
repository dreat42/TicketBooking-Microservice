import express from 'express';

import {json} from 'body-parser';


import mongoose from 'mongoose';

import cookieSession from 'cookie-session';

import { errorHandler , NotFoundError ,currentUser } from '@shaguntickets/common';

import {createTicketRouter} from './routes/createTicket';
import {indexTicketRouter} from './routes/IndexTicket';
import { showTicketRouter } from './routes/showTicket';
import {updateTicketRouter} from './routes/updateTicket'
import { natsWrapper } from './nats-wrapper';
import { OrderCancelledListener } from './events/listeners/order-updated-listener';
import { OrderCreatedListener  } from './events/listeners/order-created-listener';


const app= express();

app.set('trust proxy',true);
app.use(json());

app.use(
   cookieSession({
      signed:false,
       secure:true
   })
)

app.use(currentUser);
app.use(createTicketRouter);
app.use(indexTicketRouter);
app.use(showTicketRouter);
app.use(updateTicketRouter);
 
app.all('*', () => {
    throw new NotFoundError();
});

app.use(errorHandler);

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error('JWT_KEY must be defined');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be defined');
  }
  if (!process.env.NATS_CLIENT_ID) {
    throw new Error('NATS_CLIENT_ID must be defined');
  }
  if (!process.env.NATS_URL) {
    throw new Error('NATS_URL must be defined');
  }
  if (!process.env.NATS_CLUSTER_ID) {
    throw new Error('NATS_CLUSTER_ID must be defined');
  }

  try {
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );
     natsWrapper.client.on('close', () => {
      console.log('NATS connection closed!');
      process.exit();
    });
    process.on('SIGINT', () => natsWrapper.client.close());
    process.on('SIGTERM', () => natsWrapper.client.close());


    new OrderCreatedListener(natsWrapper.client).listen()
    new OrderCancelledListener(natsWrapper.client).listen();

     await mongoose.connect(process.env.MONGO_URI);
     console.log('Connected to MongoDb');
   } catch (err) {
     console.error(err);
   }
 
   app.listen(3000, () => {
     console.log('Listening on port 3000!!!!!!!!');
   });
 };
 
 start();






