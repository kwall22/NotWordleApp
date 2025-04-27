 let app = Vue.createApp({
    data: function(){
        const correctWord = [];
        return {
            socket: null,
            currentPlayerId: 0,
            currentPlayersTurns: [],
            maxGuesses: 6,
            winStatus: false,
            playerStatus: "",
            maxLetters: 5,
            errorMessage: "",
            badGuess: false,
            guessesLeft: 6,
            loseStatus: false,
            guessColors: [
                ['grey', 'grey', 'grey', 'grey', 'grey'],
                ['grey', 'grey', 'grey', 'grey', 'grey'],
                ['grey', 'grey', 'grey', 'grey', 'grey'],
                ['grey', 'grey', 'grey', 'grey', 'grey'],
                ['grey', 'grey', 'grey', 'grey', 'grey'],
                ['grey', 'grey', 'grey', 'grey', 'grey']
            ],
            currentGuessIndex: 0,
            guesses: [
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', '']
            ],
            currentGuessNumber: 1
        }
    },

    methods: {
        receiveMessage: function(message){
            console.log("message from app.js =  " , message);
            if (message.playerId){
                this.currentPlayerId = message.playerId;
                this.currentPlayersTurns = message.playersTurns;
            }
            if (message.action == "receiveAnswer"){
                console.log("in app.js message.currentAnswer = ", message.currentAnswer);
                this.correctWord = message.currentAnswer;
                return;
            }
            if (message.action == "invalidWord"){
                this.errorMessage = "Thats not a word";
                this.badGuess = true;
                return;
            }
            if (message.action == "duplicateGuess"){
                this.errorMessage = "Already guessed";
                this.badGuess = true;
                return;
            }
            if (message.action == "winner"){
                this.getColors(message.answer, message.guess);
                this.currentGuessIndex = -1;
                this.winStatus = true; 
            }
            if (message.action == "teammateWin"){
                const teammatesWord = message.teammatesWord;
                const guessNumber = message.guessNumber - 1;
                const otherPlayerId = this.currentPlayerId === 1 ? 2 : 1;
                this.guesses[guessNumber][0] = teammatesWord[0];
                this.guesses[guessNumber][1] = teammatesWord[1];
                this.guesses[guessNumber][2] = teammatesWord[2];
                this.guesses[guessNumber][3] = teammatesWord[3];
                this.guesses[guessNumber][4] = teammatesWord[4];
                const notVarCorrectWord = this.correctWord.slice();
                this.getColors(notVarCorrectWord, this.guesses[guessNumber]);
            }
            if (message.action == "success"){
                this.badGuess = false;
                console.log("in submit guess, this.correctword= ", this.correctWord);
                const notVarCorrectWord = this.correctWord.slice();
                this.getColors(notVarCorrectWord, this.guesses[this.currentGuessIndex]);
                console.log(this.guessColors);
                this.currentGuessIndex++;
                this.guessesLeft -= 1;
            }
            
            if (message.action == "teammateGuess") {
                this.badGuess = false;
                const teammatesWord = message.teammatesWord;
                const guessNumber = message.guessNumber - 1;
        
                const otherPlayerId = this.currentPlayerId === 1 ? 2 : 1;
        
                if (otherPlayerId !== this.currentPlayerId) {
                    console.log("teammates word:" ,teammatesWord);
                    console.log("other player id: ", otherPlayerId);
                    console.log("guess number: ", guessNumber);
                    this.guesses[guessNumber][0] = teammatesWord[0];
                    this.guesses[guessNumber][1] = teammatesWord[1];
                    this.guesses[guessNumber][2] = teammatesWord[2];
                    this.guesses[guessNumber][3] = teammatesWord[3];
                    this.guesses[guessNumber][4] = teammatesWord[4];
                    const notVarCorrectWord = this.correctWord.slice();
                    this.getColors(notVarCorrectWord, this.guesses[guessNumber]);
                    this.currentGuessIndex++;
                    this.guessesLeft -= 1;
                }
            }
        },
        sendMessage: function(message){
            this.socket.send(JSON.stringify(message)); 
        },
        getColors: function(answer, currentGuess) {
            if (this.currentGuessIndex == -1){
                return;
            }
            var tempAnswer = answer;
            var resultList = [0,0,0,0,0];
            for (var i = 0; i < currentGuess.length; i++){
                if (currentGuess[i] == tempAnswer[i]){
                    console.log("tempAnswer: ", tempAnswer);
                    console.log("current guess index ", this.currentGuessIndex)
                    tempAnswer[i] = null;
                    resultList[i] = 1;
                    this.guessColors[this.currentGuessIndex][i] = '#8cb384';
                }
            }
            for (var i = 0; i < currentGuess.length; i++){
                var correctIndex = tempAnswer.indexOf(currentGuess[i]);
                if (correctIndex >= 0 && resultList[i] == 0){
                    tempAnswer[correctIndex] = null;
                    resultList[i] = 2;
                    this.guessColors[this.currentGuessIndex][i] = '#faf76f';
                }
            }
            console.log("temp answer:", tempAnswer);
        },
        submitGuess: function() {
            if ((this.guesses[this.currentGuessIndex].indexOf('') != -1) || (this.guesses[this.currentGuessIndex].indexOf(' ') != -1)){
                this.errorMessage = "you have to fill in all squares";
                this.badGuess = true;
                return;
            }
            var letter1 = this.guesses[this.currentGuessIndex][0];
            var letter2 = this.guesses[this.currentGuessIndex][1];
            var letter3 = this.guesses[this.currentGuessIndex][2];
            var letter4 = this.guesses[this.currentGuessIndex][3];
            var letter5 = this.guesses[this.currentGuessIndex][4];
            var message = {
                action: "guess",
                guessNumber: this.currentGuessIndex + 1,
                player: this.currentPlayerId,
                firstLetter: letter1,
                secondLetter: letter2,
                thirdLetter: letter3,
                forthLetter: letter4,
                fifthLetter: letter5
            };
            this.sendMessage(message);
        },
        isGuessDisabled: function(guessIndex) {
            if (this.playerStatus == "Single"){
                return guessIndex !== this.currentGuessIndex;
            }else{
                return (guessIndex !== this.currentGuessIndex || (this.currentPlayersTurns.indexOf(guessIndex) == -1));
            }
        },
        isCurrentPlayerRow: function(rowNumber) {
            if (this.playerStatus == "Single"){
                return rowNumber == this.currentGuessIndex;
            }else{
                return (rowNumber == this.currentGuessIndex && !(this.currentPlayersTurns.indexOf(rowNumber) == -1))
            }
        },
        checkGuess: function(guess) {
            console.log("Checking guess:", guess);
        },
        getWhoseTurn: function(){
            return ((this.currentPlayersTurns.indexOf(this.currentGuessIndex) == -1));
        },
        moveFocusToNextOrPreviousInput: function(event, index) {
            const inputs = document.querySelectorAll('input[type="text"]');
            if (event.key === 'Backspace' && index > 0 && !event.target.value) {
                inputs[index - 1].focus();
            } else if (event.target.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        },
        getAnswerFromServer: function(){
            var message = {
                action: "getAnswer"
            }
            this.sendMessage(message);
        },
        singlePlayer: function(){
            var message = {
                action: "singlePlayer"
            }
            this.sendMessage(message);
        }
    },
    
    created: function(){
        console.log("vue created function ran");
        this.socket = new WebSocket("ws://localhost:8080");
        this.socket.onmessage = (event) =>{
            this.receiveMessage(JSON.parse(event.data));
        };
    }
}).mount("#app");