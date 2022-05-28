// combining keys to get API URL
const apiURL = endpoint + "face/v1.0/detect";

// selecting all required DOM elements 
const timerText = document.querySelector('.timer');
const vid = document.querySelector('video');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const spinner = document.querySelector('#spinner')
const oneElement = document.getElementById('one');
const answerElement = document.getElementById("answer");
const outputClass = document.querySelector('.output');
const btnctrl = document.querySelectorAll('.btnctrl');
const sizeValue = document.querySelector('#sizeValue');
const ageValue = document.querySelector('#ageValue');
const fontValue = document.querySelector('#fontValue');

let timer = 3;              // timer for taking snapshots
let isWebCamOn = false;     // boolean to represent state of webcam
let aspectRatio = null;     // aspect ratio of video

// Reading text
const readingText = [
    "Microsoft was founded by Bill Gates and Paul Allen on April 4, 1975, to develop and sell BASIC interpreters for the Altair 8800. It rose to dominate the personal computer operating system followed by Microsoft Windows. It has increasingly diversified from the operating system market and has made a number of corporate acquisitions, their largest being the acquisition of LinkedIn for $26.2 billion in December 2016.",
    "Dethroned by Apple in 2010, in 2018 Microsoft reclaimed its position as the most valuable publicly traded company in the world. In April 2019, Microsoft reached the trillion-dollar market cap, becoming the third U.S. public company to be valued at over $1 trillion after Apple and Amazon respectively.",
    "In microsoft logo, orange colour stands for Microsoft’s Office products, green colour for Microsoft Gaming, yellow for Microsoft Hardware and the light blue colour stand for the Windows!!",
    "Satya Nadella, the India-born CEO of Microsoft said that the company is committed to using its resources to support covid pandemic relief efforts in India and is partnering with the US chamber of Commerce and Business to provide critical medical supplies to the country.",
    "Microsoft has been rated the most environmentally friendly company by the nonprofit Just Capital in 2019. It reduced its products packaging by 20% and donated billions in NGOs in 2018. Company uses its AI to address global warming in India, providing software tools to help produce higher crop harvest."
];
// selecting a random text for displaying
oneElement.innerHTML = readingText[Math.floor(Math.random() * readingText.length + 1) - 1];

btnctrl[1].disabled = true; // disabling the stopWebCamButton in starting

// takes the snapshot of video for processing image
function takeSnapShot() {
    takeSnap().then(blob => {
        apiCallForImage(blob, {
            "returnFaceId": "true",
            "returnFaceLandmarks": "true",
            "returnFaceAttributes": "age,glasses"
        }, displayOutput);
    })
}

// used for timer 
setInterval(() => {
    // if webCam is off then we don't want to incr timer
    if (!isWebCamOn) {
        if (timerText.classList.contains('zoomAnimate'))    // removing animation on timer
            timerText.classList.remove('zoomAnimate')
        return;
    }

    if (!timerText.classList.contains('zoomAnimate'))       // adding animation on timer
        timerText.classList.add('zoomAnimate')

    if (timer === 0) {
        if (outputClass.style.display == 'none') outputClass.style.display = 'block';
        timer = 3;
        takeSnapShot(); // taking snapshot of video when timer reaches 0 and then reseting the timer to 3 sec
    } else timer--;

    timerText.innerHTML = timer; // setting timer value
}, 1000);


// ask permision from user and start webcam
function startWebcam() {

    isWebCamOn = true;
    btnctrl[1].disabled = false; // enable the stop webcam button

    // request camera
    navigator.mediaDevices.getUserMedia({
        video: true
    }).then(stream => {
        // show video on video element
        vid.srcObject = stream;
        return vid.play();
    }).then(() => {
        // calculating aspect ratio
        aspectRatio = (vid.videoWidth / vid.videoHeight);

        // setting the width according to aspect ratio
        document.querySelectorAll('.changeWidthDyn').forEach(el => {
            el.style.width = ((parseInt(el.style.height) * aspectRatio) + 'em');
        })

    }).catch(e => console.log('error: ' + e));
}

// take and display snapshot of image from webcam and convert it into blob
function takeSnap() {
    // setting size of canvas where img to be displayed
    canvas.width = vid.videoWidth;
    canvas.height = vid.videoHeight;

    // draw img to canvas
    ctx.drawImage(vid, 0, 0);

    // show spinner while the promised is in pending state
    spinner.classList.remove('hidden');

    return new Promise(res => {
        // request a Blob from the canvas
        canvas.toBlob(res, 'image/jpeg');
    });
}

// stop webcam
function stopWebcam() {
    isWebCamOn = false;
    btnctrl[1].disabled = true; // disable the stop web cam button

    vid.srcObject.getTracks().forEach((track) => {
        track.stop();
    });
}


// analyse image using cognitive services of Microsoft 
// image, parameters    -> to be sent to API
// displayFunction      -> for displayinf and processing output from API
function apiCallForImage(image, parameters, displayFunction) {

    // create API URL
    let urlWithParams = apiURL + "?" + Object.entries(parameters).map(([key, val]) => `${key}=${val}`).join('&');

    // API call
    fetch(urlWithParams, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "Ocp-Apim-Subscription-Key": OcpApimSubscriptionKey
        },
        processData: false,
        body: image,
    })
        .then(response => response.json())      // turn the response into json
        .then(json => displayFunction(json))    // send the response to displayFunction
        .catch(error => {                       // catch errors if something went wrong
            answerElement.innerHTML = ("check if camera is available and your face is clearly visible in camera and refresh the page");
            console.log(error);
            stopTheProg();
        });
}

// function to display results by manipulating DOM
function displayOutput(json) {

    spinner.classList.add('hidden'); // hide the spinner when json is avail

    // if glasses then warning
    if (json[0].faceAttributes.glasses !== 'NoGlasses') {
        answerElement.innerHTML = ("Please remove your specs and restart");
        stopTheProg();      // to stop the program 
        return;
    }

    // if font size exceed max font size then warning
    if (parseFloat(oneElement.style.fontSize) > 16) {
        answerElement.innerHTML = ("You may need glasses, consult doctor");
        stopTheProg();      // to stop the program
        return;
    }

    // calculating the expected eye daimeter when able to read clealy
    const expectedEye = json[0].faceRectangle.height * 0.0577464788732394;

    // eyes are fine
    if (json[0].faceLandmarks.eyeLeftBottom.y - json[0].faceLandmarks.eyeLeftTop.y < expectedEye) {
        answerElement.innerHTML = ("The fontsize is not correct, wait");
        oneElement.style.fontSize = ((parseFloat(oneElement.style.fontSize) + 2) + 'px');
        sizeValue.innerHTML = oneElement.style.fontSize;
    }
    // eyes are not fine
    else if (json[0].faceLandmarks.eyeLeftBottom.y - json[0].faceLandmarks.eyeLeftTop.y >= expectedEye) {
        answerElement.classList.remove('answerWrong');
        answerElement.classList.add('answerCorrect');
        answerElement.innerHTML = ("Your eyes are fine");
        answerElement.classList.add("answerCorrect");
        ageValue.innerHTML = 'Expected Age : ' + json[0].faceAttributes.age;
        fontValue.innerHTML = 'Suitable Font : ' + sizeValue.innerHTML;
        stopTheProg();      // to stop the program
    }
}

// function to stop the program
function stopTheProg() {
    stopWebcam();                                   // stop the web cam 
    btnctrl.forEach(btn => btn.disabled = true);    // disable both buttons
}
