// Online event id kisalle
const ol_eventid = "2023_tamperesprint";
const online_domain = "./corsproxy.php?csurl=https://online4.tulospalvelu.fi";

// Create a fuzzy set for names from the CSV data
const fuzzyNames = FuzzySet([], false);

let selectedCategory = "";
let debug = false;
let timeRes = 1;

document.getElementById('loadCSVButton').addEventListener('click', function () {
	selectedCategory = document.getElementById('category').value;
	debug = document.getElementById('debug').checked;
	const csvFileName = `ranki${selectedCategory}.csv`;

	console.log("Fetch ranki");

	fetch(csvFileName)
		.then(response => response.text())
		.then(csvContent => {
			const dataArray = parseCSV(csvContent);
			displayData(dataArray);
		})
		.catch(error => console.error('Error loading CSV:', error));
});

function parseCSV(csvContent) {
	const dataArray = [];
	const lines = csvContent.split('\n');
	const headers = lines[1].split(';');
	const nameIndex = headers.indexOf('Nimi');
	const pisteetIndex = headers.indexOf('Pisteet');

	for (let i = 2; i < lines.length; i++) {
		const values = lines[i].split(';');
		if (values.length < 2) continue;
		const name = values[nameIndex];
		const pisteet = values[pisteetIndex];
		dataArray.push({ name, points: pisteet });
		fuzzyNames.add(name);
	}

	return dataArray;
}

function displayData(dataArray) {
	const output = document.getElementById('output');
	output.innerHTML = '<p>Reading results...</p>';
	
	/*dataArray.forEach(item => {
		const div = document.createElement('div');
		div.textContent = `Name: ${item.name}, Points: ${item.points}`;
		output.appendChild(div);
	});*/

	// fetch results
	console.log("Fetch results");
	loadResults().done((results) => {
		console.log("loadresults:", results);
		if (results == null || results == "") {
			output.append("Error reading results");
			return;
		}

		let resultsK1 = results[0];
		let resultsK2 = results[1];

		// combine points
		const resultsWithPointsK1 = addPointsToResults(resultsK1, dataArray);
		const resultsWithPointsK2 = addPointsToResults(resultsK2, dataArray);

		let heatsresults = generateHeats(resultsWithPointsK1, resultsWithPointsK2);
		let heats = heatsresults[0];
		let combinedResults = heatsresults[1];
		console.log(heats);

		// Usage example
		const heatsTable = createHeatsTable(heats);
		console.log(heatsTable);
		output.appendChild(heatsTable);

		addResultsToDOM(combinedResults, output);
		
	})
	.fail((err) => {
		output.append("Error reading results");
	});
}

// Function to add results to the DOM
function addResultsToDOM(results, output) {

    // Create a table to display the results
    const table = document.createElement('table');

    // Create table headers
    const headerRow = table.createTHead().insertRow(0);
	const posHeader = document.createElement('th');
    posHeader.textContent = 'Pos';
    const nameHeader = document.createElement('th');
    nameHeader.textContent = 'Name';
    const timeHeader = document.createElement('th');
    timeHeader.textContent = 'Time';
    const statusHeader = document.createElement('th');
    statusHeader.textContent = 'Status';
    headerRow.appendChild(posHeader);
	headerRow.appendChild(nameHeader);
    headerRow.appendChild(timeHeader);
    headerRow.appendChild(statusHeader);

    // Create table body and add results
    const tbody = table.createTBody();
	for (let i = 0; i < results.length; i++) {
		let result = results[i];

        const row = tbody.insertRow();

		const posCell = row.insertCell(0);
        posCell.textContent = result.time > 0 ? i+1 : "";

        const nameCell = row.insertCell(1);
        nameCell.textContent = result.name;

        const timeCell = row.insertCell(2);
        timeCell.textContent = formatTime(result.time,timeRes);

        const statusCell = row.insertCell(3);
        statusCell.textContent = result.status;
    }

    // Append the table to the container
    output.appendChild(table);
}

function formatTime(time, timePrecision) {
    const seconds = Math.floor(time / timePrecision) % 60;
    const minutes = Math.floor(time / (timePrecision * 60)) % 60;
    const hours = Math.floor(time / (timePrecision * 3600));

    // Add leading zeros if needed
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

	if (hours > 0) {
    	return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
	} else {
		return `${formattedMinutes}:${formattedSeconds}`;
	}
}

function createHeatsTable(heats) {
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');

    // Create table header with heat numbers
    for (let i = 0; i < heats.length; i++) {
        const headerCell = document.createElement('th');
        headerCell.textContent = `Heat ${i + 1}`;
        headerRow.appendChild(headerCell);
    }
    table.appendChild(headerRow);

    // Determine the maximum number of runners in any heat
    const maxRunners = Math.max(...heats.map(heat => heat.length));

    // Create rows for each runner
    for (let i = 0; i < maxRunners; i++) {
        const row = document.createElement('tr');

        // Create cells for each heat
        for (let j = 0; j < heats.length; j++) {
            const cell = document.createElement('td');
            if (i < heats[j].length) {
				if (debug) {
                	cell.textContent = heats[j][i].name + " (" + heats[j][i].Kplace + ", "+heats[j][i].time+" "+heats[j][i].status+", ranki "+heats[j][i].points+")";
				} else {
					cell.textContent = (heats[j][i].time == null ? "*" : "") + heats[j][i].name + (heats[j][i].status != "OK" ? " ("+heats[j][i].status+")" : "");
				}
            }
            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    return table;
}

// Function to order results by time and points
function orderResults(results) {
    return results.sort((a, b) => {
        if (a.time === b.time) {
            return b.points - a.points;
        }
		if (a.status.charAt(0) == "D") return 1;
		if (b.status.charAt(0) == "D") return -1;
		if (a.time < 1 || a.time == null) return 1;
		if (b.time < 1 || b.time == null) return -1;
        return a.time - b.time;
    });
}

function generateHeats(k1Results, k2Results) {
    const orderedK1Results = orderResults(k1Results);
    const orderedK2Results = orderResults(k2Results);

	for (let i = 0; i < orderedK1Results.length; i++) {
		orderedK1Results[i] = {...orderedK1Results[i], Kplace: "K1: "+(i+1)};
	}
	for (let i = 0; i < orderedK2Results.length; i++) {
		orderedK2Results[i] = {...orderedK2Results[i], Kplace: "K2: "+(i+1)};
	}

	let combinedResults = [];
	for (let i = 0; i < orderedK1Results.length || i < orderedK2Results.length; i++) {
        if (i < orderedK1Results.length) {
            combinedResults.push(orderedK1Results[i]);
        }
        if (i < orderedK2Results.length) {
            combinedResults.push(orderedK2Results[i]);
        }
    }

	for (let i = 0; i < combinedResults.length; i++) {
		combinedResults[i] = {...combinedResults[i], cplace: i+1};
	}

	console.log(combinedResults);

    const heats = [[], [], [], [], [], []];

    // Heat 1
    heats[0].push(combinedResults[0]);
    heats[0].push(combinedResults[11]);
    heats[0].push(combinedResults[12]);
    heats[0].push(combinedResults[23]);
    heats[0].push(combinedResults[24]);
    heats[0].push(combinedResults[35]);

    // Heat 2
    heats[1].push(combinedResults[5]);
    heats[1].push(combinedResults[6]);
    heats[1].push(combinedResults[17]);
    heats[1].push(combinedResults[18]);
    heats[1].push(combinedResults[29]);
    heats[1].push(combinedResults[30]);

    // Heat 3
    heats[2].push(combinedResults[1]);
    heats[2].push(combinedResults[10]);
    heats[2].push(combinedResults[13]);
    heats[2].push(combinedResults[22]);
    heats[2].push(combinedResults[25]);
    heats[2].push(combinedResults[34]);

    // Heat 4
    heats[3].push(combinedResults[4]);
    heats[3].push(combinedResults[7]);
    heats[3].push(combinedResults[16]);
    heats[3].push(combinedResults[19]);
    heats[3].push(combinedResults[28]);
    heats[3].push(combinedResults[31]);

    // Heat 5
    heats[4].push(combinedResults[2]);
    heats[4].push(combinedResults[9]);
    heats[4].push(combinedResults[14]);
    heats[4].push(combinedResults[21]);
    heats[4].push(combinedResults[26]);
    heats[4].push(combinedResults[33]);

    // Heat 6
    heats[5].push(combinedResults[3]);
    heats[5].push(combinedResults[8]);
    heats[5].push(combinedResults[15]);
    heats[5].push(combinedResults[20]);
    heats[5].push(combinedResults[27]);
    heats[5].push(combinedResults[32]);

    return [heats, combinedResults];
}

// Function to add points to results based on similar names
function addPointsToResults(results, points) {
    return results.map(result => {
        const matchingPoint = points.find(point => areNamesSimilar(result.name, point.name));
        if (matchingPoint) {
            return {
                ...result,
                points: matchingPoint.points
            };
        }
        return result;
    });
}

// Function to find the most similar name
function findMostSimilarName(targetName) {
    const matches = fuzzyNames.get(targetName);
    if (matches && matches.length > 0) {
        // Get the best match (highest score)
        const bestMatch = matches[0][1];
        return bestMatch;
    }
	console.log("No match: "+targetName);
    return null; // No match found
}

function addPointsToResults(results, points) {
    return results.map(result => {
        const matchingPoint = points.find(point => point.name === findMostSimilarName(result.name));
        if (matchingPoint) {
            return {
                ...result,
                points: matchingPoint.points
            };
        }
        return {
			...result,
			points: 0
		};
    });
}

function loadResults() {

	let classname = selectedCategory || "H21";
	let classidK1 = -1;
	let classidK2 = -1;
	let raceno = 1;

	const online_event_url = online_domain+"/tulokset-new/online/online_"+ol_eventid+"_event.json&a="+Date.now();
	const online_competitors_url = online_domain+"/tulokset-new/online/online_"+ol_eventid+"_competitors.json&a="+Date.now();
	
	// fetch event.json, competitors.json
	let onlinepromise = $.get(online_event_url, "", null, 'json');
	

	return $.when(onlinepromise).then((eventret) => {

		console.log(eventret);
		let event = eventret;
		//return;

		if (event == null || event == "") {
			return false;
		}

		const allowfollowall = event.Headers.AllowFollowAll;
		timeRes = event.Headers.TimePrecision;
		const eventtype = event.Headers.EventType; // Individual or Relay
		let starttimecol = -1;
		let resultscol = -1;
		let statuscol = -1;
		const timezone = event.Races[0].RaceTimeZoneMin;

		// for starttimes check right result column
		let olrescol = eventtype == "Individual" ? "OLIndividualCompetitorRace" : "OLRelayCompetitorRace";
		for (let i in event.JsonFileFormats[olrescol]) {
			if (event.JsonFileFormats[olrescol][i] == "StartTimeReal") {
				starttimecol = i;
			}
			if (event.JsonFileFormats[olrescol][i] == "Results") {
				resultscol = i;
			}
			if (event.JsonFileFormats[olrescol][i] == "Status") {
				statuscol = i;
			}
		}
		
		// find classid
		for (let c_id in event.Classes) {
			if (event.Classes[c_id].ClassNameShort == classname+"K1") {
				classidK1 = event.Classes[c_id].ID;
			}
			if (event.Classes[c_id].ClassNameShort == classname+"K2") {
				classidK2 = event.Classes[c_id].ID;
			}
		}

		let promises = [];
		// get competitors
		promises.push($.get(online_competitors_url, "", null, 'json'));

		// get results
		if (!allowfollowall) {
			promises.push($.get(online_domain+"/tulokset-new/online/online_"+ol_eventid+"_results_"+classidK1+"_"+raceno+".json&a="+Date.now(), "", null, 'json'));
			promises.push($.get(online_domain+"/tulokset-new/online/online_"+ol_eventid+"_results_"+classidK2+"_"+raceno+".json&a="+Date.now(), "", null, 'json'));
		} else {
			promises.push($.get(online_domain+"/tulokset-new/online/online_"+ol_eventid+"_results.json&a="+Date.now(), "", null, 'json'));
		}

		return $.when(...promises).then((competitorsret, resultsret1, resultsret2) => {
		
			let competitors = competitorsret[0].Competitors;
			console.log(competitors);
			let results1 = resultsret1[0];
			let results2 = [];
			if (!allowfollowall) {
				results2 = resultsret2[0];
			}
			console.log(results1);
			console.log(results2);

			let ol_competitor_ids = [];
			let ol_competitors = [];
			let ol_competitor_names = {};
			let ol_competitor_reverse = {};
			let starttimesK1 = [];
			let starttimesK2 = [];
			let resulttimesK1 = [];
			let resulttimesK2 = [];
			let statusesK1 = [];
			let statusesK2 = [];

			if (allowfollowall) {
				let results = results1;
				// loop to find right class
				for (let i in results.Results) {
					if (results.Results[i].ClassID == classidK1 && (eventtype != "Relay" || results.Results[i].RaceNo == raceno)) {
						let classresults = results.Results[i].Results;
						// go through results to see who's in the class
						for (let i in classresults) {
							let result = classresults[i];
							ol_competitor_ids.push(result[0]);
							starttimesK1[result[0]] = result[starttimecol];
							resulttimesK1[result[0]] = result[resultscol][0][1];
							statusesK1[result[0]] = result[statuscol];
						}
						//break;
					}
					if (results.Results[i].ClassID == classidK2 && (eventtype != "Relay" || results.Results[i].RaceNo == raceno)) {
						let classresults = results.Results[i].Results;
						// go through results to see who's in the class
						for (let i in classresults) {
							let result = classresults[i];
							ol_competitor_ids.push(result[0]);
							starttimesK2[result[0]] = result[starttimecol];
							resulttimesK2[result[0]] = result[resultscol][0][1];
							statusesK2[result[0]] = result[statuscol];
						}
						//break;
					}
				}
			} else {
				// go through results to see who's in the class
				for (let i in results1.Results) {
					let result = results1.Results[i];
					ol_competitor_ids.push(result[0]);
					starttimesK1[result[0]] = result[starttimecol];
					resulttimesK1[result[0]] = result[resultscol][0][1];
					statusesK1[result[0]] = result[statuscol];
				}

				for (let i in results2.Results) {
					let result = results2.Results[i];
					ol_competitor_ids.push(result[0]);
					starttimesK2[result[0]] = result[starttimecol];
					resulttimesK2[result[0]] = result[resultscol][0][1];
					statusesK2[result[0]] = result[statuscol];
				}
			}

			if (eventtype == "Individual" || eventtype == "MultiRace") {
				// loop through all competitors to match ids
				for (let i in competitors) {
					if (ol_competitor_ids.includes(competitors[i][0])) {
						console.log("adding name: "+competitors[i][8] + " " +competitors[i][7]);
						ol_competitor_names[competitors[i][0]] = competitors[i][8] + " " +competitors[i][7];
					}
				}
			} else {
				console.log("Eventtype",eventtype);
			}

			// return results
			let resultsK1 = [];
			let resultsK2 = [];

			resulttimesK1.forEach((time, id) => {
				resultsK1.push({ name: ol_competitor_names[id], time: time, status: statusesK1[id]});
			});

			resulttimesK2.forEach((time, id) => {
				resultsK2.push({ name: ol_competitor_names[id], time: time, status: statusesK2[id]});
			});

			return [resultsK1, resultsK2];

		});
	});
}