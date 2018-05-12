const express = require ('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai = require('clarifai');

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : '@Zo!kou92@',
    database : 'faceboto'
  }
});

const expressApp = express();
expressApp.use(bodyParser.json());
expressApp.use(cors());
//Using API from Clarifai.com
const app = new Clarifai.App({
 apiKey: 'f4d2f05d61574857b6c27d92cefeb37c'
});

expressApp.post('/imageurl',(req, res) =>{
	app.models
	.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
	.then(data =>{
		res.json(data);
	})
	.catch(err => res.status(400).json('unable to receive response from clarifai'))
})

expressApp.get ('/', (req, res)=>{
	res.send(database.users);
})
expressApp.post('/signin', (req, res)=>{
	const {email, password} = req.body;
	if(!email || !password){
		return res.status(400).json('incorrect form submission');
	}
	db.select('email', 'hash').from('login')
	.where('email','=', email)
	.then(data =>{
		const validPassword= bcrypt.compareSync(password, data[0].hash);
		if(validPassword){
			return db.select('*').from('users')
			  .where('email', '=', email)
			  .then(user =>{
			  	res.json(user[0])
			  })
			  .catch(err => res.status(400).json('unable to get User'))	
		}else{
			res.status(400).json('wrong password or username')
		}
	})
    .catch(err => res.status(400).json('wrong password or username'))
})

expressApp.post('/signup', (req, res)=>{
	const {email, name, password} = req.body;
	if(!email || !name || !password){
		return res.status(400).json('incorrect form submission');
	}
	const hash = bcrypt.hashSync(password);
	//more than two things than once
	db.transaction(trx =>{
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
			.returning('*')
			.insert({
				email: loginEmail[0],
				name: name,
				joined: new Date()
			})
			.then(user => {
				res.json(user[0]);
			})
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	.catch(err=> res.status(400).json('unable to sign Up'))
})

expressApp.put('/image', (req,res)=>{
	const{id} = req.body;
	db('users').where('id', '=', id)
	.increment('entries', 1)
	.returning('entries')
	.then(entries => {
		res.json(entries[0]);;
	})
	.catch(err => res.status(400).json('unable to get entries'))
})

expressApp.listen(3000, ()=>{
	console.log('expressApp is running on port 3000');
})


/*
/ route --> res =this is working
/signin --> POST request (success/fail)
/signup POST rewuest(user)
/profile/: userId --> GET(user)
/image --> PUT(count)
*/