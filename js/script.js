console.log(`lets write javascript`);
let currentSong = new Audio();
let songs = [];
let currFolder;
let songsManifest = null;
let currentTrack = null;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00 ";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function loadManifest() {
    if (!songsManifest) {
        const res = await fetch("songs/manifest.json");
        songsManifest = await res.json();
    }
    return songsManifest;
}

function getOrCreateSpotifyEmbed() {
    let embed = document.getElementById("spotifyEmbed");
    if (!embed) {
        embed = document.createElement("div");
        embed.id = "spotifyEmbed";
        embed.style.display = "none";
        document.querySelector(".playbar").appendChild(embed);
    }
    return embed;
}

function setSpotifyEmbedMode(enabled, track = null) {
    const embed = getOrCreateSpotifyEmbed();
    const abovebar = document.querySelector(".abovebar");
    const seekbar = document.querySelector(".seekbar");

    if (enabled && track) {
        abovebar.style.display = "none";
        seekbar.style.display = "none";
        embed.style.display = "block";
        embed.innerHTML = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0" width="100%" height="80" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    } else {
        embed.style.display = "none";
        embed.innerHTML = "";
        abovebar.style.display = "flex";
        seekbar.style.display = "block";
    }
}

async function getSongs(folder) {
    currFolder = folder;
    const albumName = folder.replace(/^songs\//, "");
    const manifest = await loadManifest();
    songs = manifest[albumName] || [];

    // show all the songs in the playlist
    let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
    songUL.innerHTML = "";
    for (const song of songs) {
        const isSpotify = typeof song === "object" && song !== null;
        const title = isSpotify ? song.title : song;
        const subtitle = isSpotify ? "Spotify" : "Harshad";
        const iconHtml = isSpotify && song.cover
            ? `<img class="song-thumb" src="${song.cover}" alt="" loading="lazy">`
            : `<img class="invert" width="34" src="img/music.svg" alt="">`;

        songUL.innerHTML = songUL.innerHTML + `<li>${iconHtml}
              <div class="info">
                <div> ${title}</div>
                <div>${subtitle}</div>
              </div>
              <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="img/Play.svg" alt="">
              </div>  </li>`;
    }

    //Attach an event listener to each song
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach((e, idx) => {
        e.addEventListener("click", () => {
            playMusic(songs[idx]);
        });
    });
    return songs;
}

const playMusic = (track, pause = false) => {
    if (!track) return;
    currentTrack = track;

    const activeIndex = songs.indexOf(track);
    Array.from(document.querySelectorAll(".songList ul li")).forEach((li, idx) => {
        li.classList.toggle("active", idx === activeIndex);
    });

    if (typeof track === "object" && track !== null) {
        currentSong.pause();
        play.src = "img/Play.svg";
        document.querySelector(".songinfo").innerHTML = track.title;
        document.querySelector(".songtime").innerHTML = "Spotify";
        if (!pause) {
            setSpotifyEmbedMode(true, track);
        } else {
            setSpotifyEmbedMode(false);
        }
        return;
    }

    setSpotifyEmbedMode(false);
    const folderPath = currFolder.split("/").map(encodeURIComponent).join("/");
    currentSong.src = `${folderPath}/${encodeURIComponent(track)}`;
    if (!pause) {
        currentSong.play();
        play.src = "img/pause.svg";
    }

    document.querySelector(".songinfo").innerHTML = track;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}

async function displayAlbums() {
    console.log("displaying albums");
    const manifest = await loadManifest();
    let cardContainer = document.querySelector(".cardContainer");
    for (const folder of Object.keys(manifest)) {
        let a = await fetch(`songs/${encodeURIComponent(folder)}/info.json`);
        let response = await a.json();
        cardContainer.innerHTML = cardContainer.innerHTML + `<div data-folder="${folder}" class="card ">
            <div  class="play">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" stroke-width="1.5" fill="#000" stroke-linejoin="round" />
              </svg>
            </div>

            <img src="songs/${encodeURIComponent(folder)}/cover.jpg" alt="">
            <h2>${response.title}</h2>
            <p>${response.description}</p>
          </div>`;
    }
    //Load the playlist whenever card is clicked
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            console.log("Fetching Songs");
            songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
            if (songs.length > 0) {
                playMusic(songs[0]);
            }
        });
    });
}


async function main() {
    //get the list of all the songs 
    await getSongs("songs/F");
    if (songs.length > 0) {
        playMusic(songs[0], true);
    }

    // Display all the albums on the page
    await displayAlbums();

    //attach an event listener to the play button
    play.addEventListener("click", () => {
        if (typeof currentTrack === "object" && currentTrack !== null) {
            setSpotifyEmbedMode(true, currentTrack);
            return;
        }
        if (currentSong.paused) {
            currentSong.play();
            play.src = "img/pause.svg";
        }
        else {
            currentSong.pause();
            play.src = "img/Play.svg";
        }
    });

    // Listen for timeupdate event
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    //Add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100;
    });

    //Add an event listener for hamburger 
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    //Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    //add an event listener for previous 
    previous.addEventListener("click", () => {
        currentSong.pause();
        console.log("Previous clicked");
        let index = songs.indexOf(currentTrack);
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1]);
        }
    });

    //add an event listener for next 
    next.addEventListener("click", () => {
        currentSong.pause();
        console.log("Next clicked");
        let index = songs.indexOf(currentTrack);
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    //Add an event to volume
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        console.log("Setting volume to", e.target.value, "/ 100");
        currentSong.volume = parseInt(e.target.value) / 100;
        if (currentSong.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg");
        }
    });

    //add event listener to mute the track
    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("volume.svg", "mute.svg");
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else {
            e.target.src = e.target.src.replace("mute.svg", "volume.svg");
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }
    });
}

main();
