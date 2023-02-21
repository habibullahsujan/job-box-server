const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

require("dotenv").config();

const cors = require("cors");

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster1.rvqsrsr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const server = async () => {
  try {
    const db = client.db("job-box").collection("users");
    const jobsDB = client.db("job-box").collection("jobs");
    const messagesCollection=client.db('job-box').collection('messages');
    const appliedJobs=client.db('job-box').collection('appliedJobs')

    app.post("/job", async (req, res) => {
      const doc = req.body;
      const result = await jobsDB.insertOne(doc);
      res.send(result);
    });
    app.get("/user/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await db.findOne(query);
      if (result?.email) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });
    app.post("/user", async (req, res) => {
      const doc = req.body;
      const result = await db.insertOne(doc);
      res.send(result);
    });
    app.get("/jobs", async (req, res) => {
      const query = {};
      const result = await jobsDB.find(query).toArray();
      res.send({ status: true, data: result });
    });
    app.get("/job/:id", async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await jobsDB.findOne({ _id: id });
      res.send({ status: true, data: result });
    });
    app.patch("/apply", async (req, res) => {
      const userId = new ObjectId(req.body.userId);
      const email = req.body.email;
      const jobId = new ObjectId(req.body.jobId);
      const filter = { _id: jobId };
      const updatedDoc = {
        $push: {
          applicants: { id: userId, email, time:req.body.time },
        },
        $set: {
          totalApplication: req.body.applicants,
        },
      };
      const result = await jobsDB.updateOne(filter, updatedDoc);
      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });
    app.get("/added-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { employerEmail: email };
      const result = await jobsDB.find(query).toArray();
      res.send({ status: true, data: result });
    });
    app.get("/applied-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { applicantEmail:email};
      const cursor = appliedJobs.find(query);
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });
    app.patch("/question", async (req, res) => {
      const userId = new ObjectId(req.body.userId);
      const email = req.body.email;
      const jobId = new ObjectId(req.body.jobId);
      const filter = { _id: jobId };
      const question = req.body.question;
      const updateDoc = {
        $push: {
          queries: {
            id: userId,
            email,
            question: question,
            reply: [],
          },
        },
      };
      const result = await jobsDB.updateOne(filter, updateDoc);

      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });
    app.patch("/reply", async (req, res) => {
      const userId = new ObjectId(req.body.userId);
      const reply = req.body.reply;
      const filter = { "queries.id": userId };
      const updateDoc = {
        $push: {
          "queries.$[user].reply": reply,
        },
      };
      const arrayFilter = {
        arrayFilters: [{ "user.id": userId }],
      };
      const result = await jobsDB.updateOne(filter, updateDoc, arrayFilter);
      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }
      res.send({ status: false });
    });
    app.patch("/job/updateStatus/:id", async (req, res) => {
      const jobId = new ObjectId(req.params.id);
      const filter = { _id: jobId };
      const updatedDoc = {
        $set: {
          applicationStatus: "closed",
        },
      };
      const result = await jobsDB.updateOne(filter, updatedDoc);
      res.send({ status: true, data: result });
    });

    app.get("/candidate/:id", async (req, res) => {
      const candidateId = new ObjectId(req.params.id);
      const filter = { _id: candidateId };
      const result = await db.findOne(filter);
      res.send(result);
    });

    app.post('/messages', async(req,res)=>{
      const doc=req.body;
      const result=messagesCollection.insertOne(doc)
      res.send(result)

    })
    app.get('/messages/:id', async(req,res)=>{
    
      const filter={receiverId:req.params.id};
      const result=await messagesCollection.find(filter).toArray();
      res.send(result);
    })
    app.get('/message/:id', async(req,res)=>{
      const id=new ObjectId(req.params.id)
      const filter={_id:id};
      const result=await messagesCollection.findOne(filter);
      res.send(result);
    });

    app.put('/reply/candidate', async(req,res)=>{
      const id=new ObjectId(req.body.id)
      const filter={_id:id};
      const options={ upsert: true }
      const updateDoc={
        $push: {
          messages: {
            candidate:req.body.message
          },
        },
      }
      const result=await messagesCollection.updateOne(filter,updateDoc,options);
      res.send(result)
    });

    app.put('/reply/employer', async(req,res)=>{
      const id=new ObjectId(req.body.id)
      const filter={_id:id};
      const options={ upsert: true }
      const updateDoc={
        $push: {
          messages: {
            employer:req.body.message
          },
        },
      }
      const result=await messagesCollection.updateOne(filter,updateDoc,options);
      res.send(result)
    })
    app.get('/messages/:id/:role', async(req,res)=>{
      let filter;
      if(req.params.role === 'employer'){
        filter={senderId:req.params.id};
      }
      if(req.params.role === 'candidate'){
        filter={receiverId:req.params.id};
      }
      const result=await messagesCollection.find(filter).toArray();
      res.send(result);
    });
    app.post('/apply-job',async(req,res)=>{
      const doc=req.body;
      console.log(doc)
      const result=appliedJobs.insertOne(doc)
      res.send(result)
    })
  } catch (error) {
    console.log(error);
  }
};

server().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("server is live now.");
});

app.listen(port, () => {
  console.log("server is running in port :5000");
});
