'use strict';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

////////////////////////////////////// form listeners ///////////////////////////////////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// IMPORTANT: use .bind(this) to point it to this App object and not the function this

/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// Classes /////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////// Workout /////////////////////////////////////////////

class Workout {
    id = (Date.now() + '').slice(-10);
    date = new Date();

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription() {
        this.description = 
        `${this.type[0].toUpperCase()}${this.type.slice(1)} on 
        ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

/////////////////////////////////// Workout Child Classes //////////////////////////////////////

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.clacPace();
        this._setDescription();
    }

    clacPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.clacSpeed();
        this._setDescription();
    }

    clacSpeed() {
        // km/hr
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

//////////////////////////////////////////// App ///////////////////////////////////////////////

class App {
    // private instance properties
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        //get User position
        this._getPosition();
        // get data from local storage
        this._getLocalStorage();
        // form submit event listener
        form.addEventListener('submit', this._newWorkout.bind(this));
        // workout change event listener
        inputType.addEventListener('change', this._toggleElevationField.bind(this));
        // setview listener
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }
    //functions
    _getPosition(){
        // get geolocation of the user if exisits
        // Params: success function, failure function
        if(navigator.geolocation)
        navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this), // binds this keyword to loadMap 
            function() {
                alert("Could not get your position")
            }
        );
    }

    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];

        // map params: coordiates, zoom amount
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        // get tiles from open source map
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        L.marker(coords)
            .addTo(this.#map)
            .bindPopup(L.popup({
                autoClose: false,
                closeOnClick: false
            }))
            .setPopupContent('You are here!')
            .openPopup();

        // handle this.map clicks
        this.#map.on('click', this._showForm.bind(this));
        // render markers AFTER map loads
        this.#workouts.forEach(work => { this._renderWorkoutMaker(work); });
    }

    _showForm(mapE){
        this.#mapEvent = mapE;
        // show form on click
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _newWorkout(event){

        // validators
        const validInputs = (...inputs) => 
        inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => 
        inputs.every(inp => inp > 0);

        // prevents reloading of page on form submit
        event.preventDefault();

        // get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // if running, create running object
        if(type === 'running') {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if(
                !validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            ) return alert('Input must be positive numbers!')

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // if cycling create cycling object
        if(type === 'cycling') {
            const elevation = +inputElevation.value;
            // Check if data is valid
            if(
                !validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration, elevation)
            ) return alert('Input must be positive numbers!')

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }
        // push workout to array
        this.#workouts.push(workout);

        // call create marker
        this._renderWorkoutMaker(workout);

        // render workout on list
        this._renderWorkout(workout);

        // clear input fields
        this._hideForm();

        // set local storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">
                    ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;
        if(workout.type === 'running')
            html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${workout.pace}</span>
                        <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">🦶🏼</span>
                        <span class="workout__value">${workout.cadence}</span>
                        <span class="workout__unit">spm</span>
                    </div>
                </li>
            `;
        if(workout.type === 'cycling')
            html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${workout.speed}</span>
                        <span class="workout__unit">km/h</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">⛰</span>
                        <span class="workout__value">${workout.elevationGain}</span>
                        <span class="workout__unit">m</span>
                    </div>
                </li>
            `;
        // insert html as sibling element after form
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        // guard statment
        if(!workoutEl) return;
        // find workout in array
        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)
        // set view of leaflet object
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        })
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

    _renderWorkoutMaker(workout) {
        console.log(workout);
        //create marker
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        }))
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`)
        .openPopup();
    }

    _toggleElevationField(){
        // closest = inverse querySelector (selects parent instead of children)
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////// Main //////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

const app = new App();



