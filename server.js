const WebSocket = require('ws');
const fs = require('fs');
const express = require('express')

const app = express()
app.use(express.static("public"))
var server = app.listen(8080, function () {
    console.log("server is running");
})

const wss = new WebSocket.WebSocketServer({server: server});

let maxClients = 2;
let nextPlayerId = 1;
let myClients = [];
let playerGrids = {};
let guessCount = 6;
const allGuesses = new Set();
const validWordList = new Set(fs.readFileSync('wordle_words.txt', 'utf8').split('\n').map(word => word.toLowerCase()));

function isGuessValid(guess) {
    const guessStr = guess.join('').toLowerCase();
    if (allGuesses.has(guessStr)) {
        return "already guessed";
    }
    if (!validWordList.has(guessStr)) {
        return "not valid";
    }
    console.log("guess == answer ", guess, theAnswer);
    const areEqual = guess.join('') === theAnswer.join('');
    if (areEqual){
        console.log("winner");
        return "winner";
    }
    else{
        return "valid";
    }
}

function generateRandomAnswer(){
    var wordList = Array.from(validWordList);
    var randomIndex = Math.floor(Math.random() * wordList.length);
    console.log("random word not .split:", (wordList[randomIndex]));
    const word = wordList[randomIndex];
    const result = word.split(''); 
    console.log("result: ", result);
    return result;
}

function sendActionToOtherClients(currentClient, actionObject){
    var message = JSON.stringify(actionObject);
    wss.clients.forEach(function (client) {
        if (client !== currentClient && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

function sendActionToAllClients(actionObject){
    var message = JSON.stringify(actionObject)
    wss.clients.forEach(function (client){
      if (client.readyState === WebSocket.OPEN){
        client.send(message);
      }
    });
};

function sendActionToCurrentClient(currentClient, actionObject){
    var message = JSON.stringify(actionObject);
    if (currentClient.readyState === WebSocket.OPEN) {
        currentClient.send(message);
    }
};

var theAnswer = [];

wss.on('connection', function connection(ws){
    ws.on('error', function (error) {
        ws.on('error', console.error);
    });
    if(myClients.length == 0){
        theAnswer = generateRandomAnswer();
        allGuesses.clear();
    }
    if (myClients.length < maxClients){
        myClients.push(ws);
    } else {
        ws.close();
        console.log("too many players, get out");
        myClients = [];
        return;
    }
    ws.playerId = nextPlayerId++;
    if (ws.playerId%2 == 1 && maxClients > 1){
        ws.send(JSON.stringify({ playerId: ws.playerId, playersTurns: [0, 2, 4] }));
        ws.send(JSON.stringify({action: "receiveAnswer", currentAnswer: theAnswer}));
    } else if (maxClients > 1){
        ws.send(JSON.stringify({ playerId: ws.playerId, playersTurns: [1, 3, 5] }));
        ws.send(JSON.stringify({action: "receiveAnswer", currentAnswer: theAnswer}));
    }
    ws.on('message', function message(data, isBinary){
        var message = JSON.parse(data);
        console.log("message in index.js = ", message);

        if(message.action == "getAnswer"){
            console.log("calling generate random answer");
            var message ={
                action: "receiveAnswer",
                currentAnswer: theAnswer
            }
            sendActionToAllClients(message);
            return;
        }
        if(message.action == "guess"){
            var wordGuessed = [
                message.firstLetter,
                message.secondLetter,
                message.thirdLetter,
                message.forthLetter,
                message.fifthLetter
            ];
            var isValid = isGuessValid(wordGuessed);
            if (isValid === "already guessed") {
                sendActionToCurrentClient(ws, {
                    action: "duplicateGuess",
                    word: wordGuessed
                });
                return;
            }
            if (isValid === "not valid") {
                sendActionToCurrentClient(ws, {
                    action: "invalidWord",
                    word: wordGuessed
                });
                return;
            }
            allGuesses.add(wordGuessed.join('').toLowerCase());

            const currentPlayer = message.player;
            const currentTeammate = currentPlayer === 1 ? 2 : 1;

            if (isValid == "winner"){
                sendActionToAllClients({
                    action: "winner",
                    answer: theAnswer,
                    guess: wordGuessed
                });
                const rowFilled = message.guessNumber;
                sendActionToOtherClients(ws, {
                    action: "teammateWin",
                    teammatesWord: wordGuessed,
                    guessNumber: rowFilled
                });
                ws.close();
                return;
            }

            guessCount -= message.guessNumber;
            sendActionToCurrentClient(ws, {
                action: "success"
            });
            const rowFilled = message.guessNumber;
            sendActionToOtherClients(ws, {
                action: "teammateGuess",
                teammatesWord: wordGuessed,
                guessNumber: rowFilled
            });
        }
    });
});