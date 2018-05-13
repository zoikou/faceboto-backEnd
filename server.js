const express = require ('express'); // import Express, a web framework for node.js
const bodyParser = require('body-parser'); // import body parser, Node.js body parsing middleware.
const bcrypt = require('bcrypt-nodejs'); // import bcrypt, for password security
const cors = require('cors'); // import cors, security cross-origin
const knex = require('knex'); // import knex for connection to the database
const Clarifai = require('clarifai'); // import clarifai, face recognition api

//Make a connection with the database on heroku servers
//Code used from https://devcenter.heroku.com/articles/heroku-postgresql#connecting-in-node-js
const db = knex({
  client: 'pg',
  connection: {
    connectionString : process.env.DATABASE_URL,
    ssl: true,
  }
});
//A variable to declare the express app
const expressApp = express();
expressApp.use(bodyParser.json());
expressApp.use(cors());
//Using API from Clarifai.com
const app = new Clarifai.App({
 apiKey: 'f4d2f05d61574857b6c27d92cefeb37c'
});


//A post request from the /imageurl endpoint to the clarifaiAPI 
expressApp.post('/imageurl',(req, res) =>{
	// code used from https://www.clarifai.com/developer/guide/
	app.models
	.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
	.then(data =>{
		res.json(data);
	})
	.catch(err => res.status(400).json('unable to receive response from clarifai'))
})
// A get request from the / endpoint to test that the server is responding 
expressApp.get ('/', (req, res)=>{
	res.send('it is working!');
})




// A post request from the /signin endpoint to check the database for the current user's password and email
expressApp.post('/signin', (req, res)=>{
	const {email, password} = req.body; 
	//if the user does not provide an email or a password don't login
	if(!email || !password){
		return res.status(400).json('incorrect form submission');
	}
	// check the login table with the specific email given from the user
	db.select('email', 'hash').from('login')
	.where('email','=', email)
	.then(data =>{
		//check the password given with the encrypted password from the table login
		//Code used from https://www.npmjs.com/package/bcrypt
		const validPassword= bcrypt.compareSync(password, data[0].hash);
		//if the password is valid then return the user from the users table which has the same email with the login table
		if(validPassword){
			//select all from users table
			return db.select('*').from('users')
			  //find the user with the specific email
			  .where('email', '=', email)
			  .then(user =>{
			  	//response with the current user
			  	res.json(user[0])
			  })
			  //catch any error 
			  .catch(err => res.status(400).json('unable to get User'))	
		}else{
			//if the password is not valid response with a message
			res.status(400).json('wrong password or username')
		}
	})
	//catch any errors occurring 
    .catch(err => res.status(400).json('wrong password or username'))
})



//A post request drom the /signup endpoint to insert the new data into the database
expressApp.post('/signup', (req, res)=>{
	const {email, name, password} = req.body;
	//if the user does not provide an email or a name or a password don't register 
	if(!email || !name || !password){
		return res.status(400).json('incorrect form submission');
	}
	//encrypt the password given from the user and store it encrypted to the db
	//code used from https://www.npmjs.com/package/bcrypt
	const hash = bcrypt.hashSync(password);
	//insert the data both to the login table and users table
	//code used from http://knexjs.org/#Transactions
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
	//catch any errors
	.catch(err=> res.status(400).json('unable to sign Up'))
})



//A put request from the /image endpoint to increase the entries of the user
expressApp.put('/image', (req,res)=>{
	const{id} = req.body;
	//code used from http://knexjs.org/#Builder-increment
	db('users').where('id', '=', id)
	.increment('entries', 1)
	.returning('entries')
	.then(entries => {
		//return the entries of the user
		res.json(entries[0]);;
	})
	//catch any errors
	.catch(err => res.status(400).json('unable to get entries'))
})
//the server is listening the heroku port and if not then listening to 3000
expressApp.listen(process.env.PORT || 3000, ()=>{
	console.log(`expressApp is running on port ${process.env.PORT}`);
})


