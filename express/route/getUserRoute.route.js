import express from 'express';
import verifyInternalToken from '../middleware/auth.js';
import startCampaign from '../controller/getUserContact.controller.js';

const route = express.Router();

const getnumber = route.post("/getnumber" ,verifyInternalToken , startCampaign);


export default getnumber