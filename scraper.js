/**
 * Created by Justin on 1/23/2017.
 */

/*
eliminate junk npm packages
make package.JSON file
push to npm.
 */

//Initializing constants & requesting packages.
const fs = require('fs'),
	request = require('request'),
	cheerio = require('cheerio'),
	jsonexport = require('jsonexport'),
	directory = './data',
	baseURL = 'http://shirts4mike.com/';

//initializing global variables.
var url = [baseURL+'shirts.php'],
	 d = new Date();

//program begins.
//checking if data folder doesn't exist, if it doesn't creates the data folder.
if (!fs.existsSync(directory)) {
	fs.mkdirSync(directory);  //make the directory since it does not exist
	}

	//performing the request to http://shirts4mike.com/shirts.php
	request.get(url[0], function (error, response, body) {
		//check there is no error and returned a status code of 200 OK
		if (!error && response.statusCode == 200) {
			//loading the dom retrieved to be used with the cheerio module to perform jquery manipulation on it.
			var $ = cheerio.load(body);
			//Calling function to handle request from first page.
			handleRequestFirstTime($);
		} else {
			writeError("Experienced issues connecting to "+url[0]);
		}
	});
/*
The function ot be called when handling the request the first time Via Entry point.
$: the JQuery object using cheerio.
 */
function handleRequestFirstTime($) {
	//Initializing local variables.
	var shirtContents = $('.products li a'),
		shirtHREF,
		 objArray = [];

	//Call a for loop for each of the shirt elements available on the initial page.
	shirtContents.each(function (i, elem) {
		shirtHREF = $(this).attr('href');
		url[i] = baseURL + shirtHREF;

		request.get(url[i], function (error, response, body) {
			if (!error && response.statusCode == 200) {
				//console.log(body); // Show the HTML for the Google homepage.
				var $ = cheerio.load(body);
				//Calling the function to handle request the second time, updating the object array on each iteration.
				objArray = handleRequestSecondTime($, objArray, i, shirtContents);
			} else {
				writeError("Successfully connected to "+baseURL+"shirts.php \nHowever experienced difficulties now connecting to " +url[i]);
			}
		}); // end of request
	}); // end of each function
}

/*
The function called to handle the requests to each of the individual shirt pages.
 $: the JQuery object using cheerio.
 objArray: The array of objects to contain data later converted to csv
 i: the index of which shirt page we are on.
 shirtContents: the object containing the information of the shirts gathered from the first page.
 */
function handleRequestSecondTime($, objArray, i, shirtContents){
	var time = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()),
	obj = {};

	//Grabbing the shirt details h1 element and then filtering out the <span> element.
	obj['Title'] = $('.shirt-details h1').contents().filter(function (index) {
		return index === 1;
	}).text();
	obj['Price'] = $('.price').text();
	obj['ImageURL'] = 'http://shirts4mike.com/' + $('.shirt-picture span img').attr('src');
	obj['URL'] = url[i];
	obj['Time'] = time;
	objArray.push(obj); // adding the obj to our objArray.

	//This code executes once the code has iterated and gathered information from each request page.
	if (objArray.length === shirtContents.length) {
		//Export the array to a csv file
		jsonexport(objArray, function (err, csv) {
			if (err) return writeError(err); //If error occurs in converting to csv file. write error through calling writeError function.
			var fileName = '/'+d.getFullYear()+'-'+ pad(d.getMonth()+1)+'-'+ pad(d.getDate())+'.csv';
			fs.writeFile(directory + fileName, csv, function (err) {
				if (err) throw err;
				process.exit(0); //end process gracefully
			}); //end write File callback
		});

		//console.log(myJSONString);
	}else if(objArray.length > shirtContents.length){
		writeError("An unexpected error occurred");
	}
	return objArray;
}

/*
Tiny utility method grabbed from http://stackoverflow.com/questions/3313875/javascript-date-ensure-getminutes-gethours-getseconds-puts-0-in-front-i
Used to add a leading 0 if it is required.
 */
function pad(n) { return ("0" + n).slice(-2); }

/*
Function called to write error when error occurs.
error: The string of the error to be written.
 */
function writeError(error) {
	//Getting the UTC date, slicing off the end of it, then appending the local time to the end afterwards, then inserting error message
	var errorFileContents = '['+d.toUTCString().slice(0,17)+d.toTimeString()+'] <' + error+'>\n',
	errorFileName = '/scraper-error.log';

	fs.appendFileSync(directory + errorFileName, errorFileContents);
	process.exit(1); //end process with error.
}