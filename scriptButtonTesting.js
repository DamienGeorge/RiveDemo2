//region Timeout Variables
const baseTimeout = 1000;
var timeout = baseTimeout;
var speed = 1;
var multiplier = 10;
//#endregion

//region Mode Variable
var IsDemo = false;
let isStandardLayout = false;

let isAutomaticMode = true;
let toggleIntervalId = null;
//#endregion

//region Global Variables
let storedPosition = null; // Store the position globally
let currentTrScreen = 0;

var spedUpDate = new Date();
let lastToggledDate;
const layoutToggleMap = new Map();
let IsSpedUp = false;
//#endregion

//#region Constants
const stateMachine = "Main state machine";
const controlsStateMachine = "State Machine 1";
const toggleInterval = 3; //Determines how often the layout toggles

const slider = document.getElementById('timeSlider');
const sliderValueDisplay = document.getElementById('sliderValue');

const TrTimeTable = 'Tr Timetable';
const TrEmergency = 'Tr Emergency';
const TrImages = 'Tr Images';
const TrTransport = 'Tr Transport';
const TrWeather = 'Tr Weather';
const TrArrivals = 'Tr Arrivals';

const LayoutVTriggerName = 'Tr Layout V';
const LayoutHTriggerName = 'Tr Layout H';

const EnableSkyTriggerName = 'Tr Sky color';
const EnableWeatherEffectsTriggerName = 'Tr Weather effects';

const SwapDetailTriggerName = 'Tr Swap';
const SkySunnyTriggerName = 'Tr Sunny';
const SkyRainTriggerName = 'Tr Rain';
const trScreens = ['Tr Timetable', 'Tr Emergency', 'Tr Images', 'Tr Transport', 'Tr Weather', 'Tr Arrivals'];
//#endregion

let inputs = null;
let consoleInputs = null;

try {
    // Get the canvas element
    const canvas = document.getElementById('rive-canvas');
    const controlsCanvas = document.getElementById('rive-canvas-controls');

    // Create Rive instance
    riveControlsInstance = new rive.Rive({
        src: 'menu_main.riv',
        canvas: controlsCanvas,
        autoplay: true,
        autoBind: true,
        artboard: "Button Testing Main",
        stateMachines: controlsStateMachine, // This ensures that animation is playing
        onLoad: () => {
            console.log('Rive animation loaded successfully');
            // Fit the animation to the canvas
            computeSize();

            consoleInputs = riveControlsInstance.stateMachineInputs(controlsStateMachine);
            //this is how to access the autobind instance
            let boundInstance = riveInstance.ViewModelInstance;
        },
        onLoadError: (error) => {
            console.error('Failed to load Rive animation:', error);
        }
    });

    function computeSize() {
        riveControlsInstance.resizeDrawingSurfaceToCanvas();
    }

    window
        .matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
        .addEventListener("change", computeSize);

    riveInstance = new rive.Rive({
        src: 'time_main_r7.riv',
        canvas: canvas,
        autoplay: true,
        autoBind: true,
        artboard: "Time Calc H",
        stateMachines: 'Main state machine',
        onLoad: () => {
            console.log('Rive animation loaded successfully');
            riveInstance.resizeDrawingSurfaceToCanvas();

            /* const viewModel = riveInstance.viewModelByIndex(0);
            const viewModelInstance = viewModel.instanceByName('MainInstance');

            riveInstance.bindViewModelInstance(viewModelInstance); */

            const viewModelInstance = riveInstance.viewModelInstance;

            const location = viewModelInstance.string('City Name');

            inputs = riveInstance.stateMachineInputs(stateMachine);
            console.log(inputs);

            //Location logic
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        storedPosition = position; // Store the position
                        const city = await getCityFromCoords(position.coords.latitude, position.coords.longitude);
                        location.value = city;
                    },
                    (error) => {
                        navigator.permissions.query({ name: 'geolocation' }).then(async result => {
                            if (result.state === 'granted') {
                                navigator.geolocation.getCurrentPosition(
                                    async (position) => {
                                        const city = await getCityFromCoords(position.coords.latitude, position.coords.longitude);
                                        location.value = city;
                                    },
                                    (error) => {
                                        console.log('Error Getting Location');
                                    }
                                );
                            } else {
                                // If geolocation is not available, use IP-based location
                                try {
                                    const response = await fetch('https://ipapi.co/json/');
                                    const data = await response.json();
                                    console.log('Geolocation is not available, using IP-based location', data.city);
                                    location.value = data.city;
                                } catch (error) {
                                    console.log('Error Getting Location'); // Fallback to London if IP location fails
                                }
                            }
                        });
                    }
                );
            }

            let date = new Date();
            startAutoToggle(date);

            const minuteInput = viewModelInstance.number('Minute Calc');
            const hourInput = viewModelInstance.number('Hour Calc');
            const secondInput = viewModelInstance.number('Second Calc');
            const minSecInput = viewModelInstance.number('MinSec Calc');

            const yearInput = viewModelInstance.number('Year');
            const monthInput = viewModelInstance.string('Month');
            const dayInput = viewModelInstance.string('Day');
            const dateInput = viewModelInstance.number('Date');

            // --- Time/Date/Weather update function ---
            function updateRiveTimeAndWeather() {
                if (speed !== 1) {
                    date = spedUpDate;
                } else {
                    date = new Date();
                }

                // 24 hour clock
                const minute = date.getMinutes();
                const hour = date.getHours();

                minuteInput.value = minute;
                hourInput.value = hour;
                secondInput.value = date.getSeconds()/100;
                minSecInput.value = minute + (date.getSeconds()/100);

                yearInput.value = date.getFullYear();
                monthInput.value = date.toLocaleString('default', { month: 'long' });
                dayInput.value = date.toLocaleString('default', { weekday: 'long' });
                dateInput.value = date.getDate();

                // Get weather data and update temperature
                const temperatureInput = viewModelInstance.number('Temperature');
                if (storedPosition) { // Use stored position instead of requesting again
                    const lastWeatherUpdate = localStorage.getItem('lastWeatherUpdate') || '0';
                    const currentTime = new Date().getTime();
                    temperatureInput.value = localStorage.getItem('temperature');
                    if (!lastWeatherUpdate || (currentTime - parseInt(lastWeatherUpdate)) >= 300000) { // 300000ms = 5 minutes
                        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${storedPosition.coords.latitude}&longitude=${storedPosition.coords.longitude}&current=temperature_2m`)
                            .then(response => response.json())
                            .then(data => {
                                if (data && data.current && data.current.temperature_2m) {
                                    const temp = Math.round(data.current.temperature_2m);
                                    temperatureInput.value = temp;
                                    localStorage.setItem('lastWeatherUpdate', currentTime.toString());
                                    localStorage.setItem('temperature', temp);
                                }
                            })
                            .catch(error => {
                                console.log('Error fetching weather data:', error);
                            });
                    }
                }

                // Only call toggleLayout in automatic mode
                if (isAutomaticMode) {
                    toggleLayout(date);
                }
            }
            // --- END Time/Date/Weather update function ---

            setInterval(updateRiveTimeAndWeather);
        },
        onLoadError: (error) => {
            console.error('Failed to load Rive animation:', error);
        },
        onPlay: () => {
            console.log('Animation started playing');
        },
        onPause: () => {
            console.log('Animation paused');
        },
        onStop: () => {
            console.log('Animation stopped');
        }
    });

    riveControlsInstance.on(rive.EventType.RiveEvent, (OnRiveEventTriggered));

} catch (error) {
    console.error('Error initializing Rive:', error);
}


// Handle window resize
window.addEventListener('resize', () => {
    if (riveInstance) {
        riveInstance.resizeDrawingSurfaceToCanvas();
    }
    if (riveControlsInstance) {
        riveControlsInstance.resizeDrawingSurfaceToCanvas();
    }
});

function OnRiveEventTriggered(event) {
    console.log(event.data.name);
    switch (event.data.name) {
        case 'Weather':
            fireTrigger(EnableWeatherEffectsTriggerName);
            break;
        case 'Sky':
            fireTrigger(EnableSkyTriggerName);
            break;
        case 'W1 Swap detail':
            fireTrigger(SwapDetailTriggerName);
            break;
        case 'W2 Sunny':
            fireTrigger(SkySunnyTriggerName);
            break;
        case 'W3 Rainy':
            fireTrigger(SkyRainTriggerName);
            break;
        case 'Layout V':
            fireTrigger(LayoutVTriggerName);
            break;
        case 'Layout H':
            fireTrigger(LayoutHTriggerName);
            break;
        case 'D1 Timings':
            fireTrigger(TrTimeTable);
            break;
        case 'D2 Emergency':
            fireTrigger(TrEmergency);
            break;
        case 'D3 Transport':
            fireTrigger(TrTransport);
            break;
        case 'D4 Explore':
            fireTrigger(TrImages);
            break;
        case 'D5 Weather':
            fireTrigger(TrWeather);
            break;
        case 'D6 Train':
            fireTrigger(TrArrivals);
            break;
        case 'Speed':
            const sliderSpeed = consoleInputs.find(i => i.name === 'Slider speed')
            console.log(sliderSpeed);
            updateSpeedSwitch(sliderSpeed.value);
            break;
        case 'Auto/Manual':
            const isAutoInput = consoleInputs.find(i => i.name === 'isAuto')
            console.log(isAutoInput.value);
            if (isAutoInput.value) {
                isAutomaticMode = true;
            } else {
                isAutomaticMode = false;
                SetLayoutH();
            }
            break;
        case 'Main/Detail Layout':
            const mainDetailLayoutInput = consoleInputs.find(i => i.name === 'isMain')
            console.log(mainDetailLayoutInput.value);
            if (mainDetailLayoutInput.value) {
                isStandardLayout = true;
                fireTrigger(LayoutHTriggerName);
            } else {
                isStandardLayout = false;
                fireTrigger(LayoutVTriggerName);
            }
        // Add more cases as needed
    }
}

function SetLayoutH() {
    isStandardLayout = true;
    fireTrigger(LayoutHTriggerName);
}

function fireTrigger(triggerName) {
    if (inputs) {
        const trigger = inputs.find(i => i.name === triggerName);
        console.log(trigger);
        trigger.fire();
    }
}

const isSunny = false;
function toggleLayout(date) {
    const currentMinute = date.getMinutes();

    //Add logic for sunny weather during day
    if (isSunny === false && date.getHours() >= 7 && date.getHours() <= 17) {
        fireTrigger(SkySunnyTriggerName);
        isSunny = true;
    }
    else if (isSunny === true && (date.getHours() < 7 || date.getHours() > 17)) {
        fireTrigger(SkyRainTriggerName);
        isSunny = false;
    }

    /* if (date.getMinutes() % toggleInterval === 0 && !layoutToggleMap.has(currentMinute)) { */
    if (!layoutToggleMap.has(currentMinute)) {
        if (IsDemo || (IsDemo == false && date.getSeconds() === 0)) {

            console.log(isStandardLayout);
            layoutToggleMap.clear();
            layoutToggleMap.set(currentMinute, true);

            if (currentMinute === 7 || currentMinute === 17 || currentMinute === 27 || currentMinute === 37 || currentMinute === 53) {
                fireTrigger(LayoutHTriggerName);
                isStandardLayout = true;
            }
            else if (currentMinute % 10 === 0 && currentMinute !== 50) {
                fireTrigger(SwapDetailTriggerName);
            }
            else {
                switch (currentMinute) {
                    case 2:
                        fireTrigger(TrTimeTable);
                        isStandardLayout = false;
                        break;
                    case 12:
                        fireTrigger(TrEmergency);
                        isStandardLayout = false;
                        break;
                    case 22:
                        fireTrigger(TrTransport);
                        isStandardLayout = false;
                        break;
                    case 32:
                        fireTrigger(TrArrivals);
                        isStandardLayout = false;
                        break;
                    case 42:
                        fireTrigger(TrImages);
                        isStandardLayout = false;
                        break;
                    case 47:
                        fireTrigger(TrWeather);
                        isStandardLayout = false;
                        break;
                }
            }
            /*  if (isStandardLayout || date.getMinutes() % 10 === 0) {
                 fireTrigger(LayoutHTriggerName);
                 isStandardLayout = true;
             } else {
                 console.log('triggering', trScreens[currentTrScreen]);
                 fireTrigger(trScreens[currentTrScreen]);
                 currentTrScreen = (currentTrScreen + 1) % trScreens.length;
             }
             isStandardLayout = !isStandardLayout; */
            lastToggledDate = date;

        }
    }
}

function startAutoToggle(date) {
    if (toggleIntervalId) clearInterval(toggleIntervalId);
    toggleIntervalId = setInterval(() => {
        if (isAutomaticMode) {
            if (speed !== 1) {
                date = spedUpDate;
            } else {
                date = new Date();
            }
            toggleLayout(date);
        }
    }, 1000); // check every second
}

function stopAutoToggle() {
    if (toggleIntervalId) {
        clearInterval(toggleIntervalId);
        toggleIntervalId = null;
    }
}

// Map speed to index and thumb position
const speedOptions = [1, 5, 10];
let currentSpeedIndex = 0;

function updateSpeedSwitch(index) {
    // Set value and call setSpeed
    setSpeed(speedOptions[index]);
    currentSpeedIndex = index;
}

// Initialize
updateSpeedSwitch(0);

function setSpeed(newSpeed) {
    speed = newSpeed;

    if (speed === 1) {
        IsDemo = false;
        timeout = baseTimeout;
        IsSpedUp = false;
    } else {
        IsDemo = true;
        timeout = (baseTimeout * multiplier) / speed;

        if (!spedUpDate || IsSpedUp === false) {
            spedUpDate = new Date();
            IsSpedUp = true;
        }

        if (window.speedUpTimeout) {
            clearTimeout(window.speedUpTimeout);
        }
        setTimeout(speedUpTime);
    }
    console.log('speed', speed);
}

function speedUpTime() {
    spedUpDate.setMinutes(spedUpDate.getMinutes() + 1);
    window.speedUpTimeout = setTimeout(speedUpTime, timeout);
}

const apiKey = '600a572faf44492fa416286dccb577ca';
const getCityFromCoords = async (lat, lon) => {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results[0]?.components.city ||
        data.results[0]?.components.town ||
        data.results[0]?.components.village ||
        data.results[0]?.components.county ||
        'Bangalore';
};