// constants
var stars_per_ring = 20;
var pi = Math.PI;
var farest_z = 120;
var proj_plane_z = 25;
var ring_radius = 10;
var ring_star_radius_ratio = 20;
var ring_interval = Math.floor(ring_radius * 2 * pi / stars_per_ring * 3);
var star_radius = ring_radius / ring_star_radius_ratio;
var max_brightness = 0.9;

var camera_speed_max = 1;
var camera_speed_min = 0;
var camera_break_delta = 0.02;


// semi-constants
var canvas = undefined;
var canvas_ctx = undefined;
var winwidth = 0;
var winheight = 0;
var zoom_ratio = 0


// dynamics
var mouse = {
    x: 0,
    y: 0,
};
var camera = {
    z: 0,
    speed: camera_speed_max,
    breaking: false,
};


function Star (theta) {
    this.x = ring_radius * Math.cos(theta);
    this.y = ring_radius * Math.sin(theta);
    this.valid = true;
}


function Ring (z) {
    this.stars = [];
    this.z = z;
    this.valid = true;

    this.move = function () {
        this.z -= camera.speed;
    };

    this.reactivate = function () {
        this.valid = true;
        for (let s = 0; s < stars_per_ring; s++) {
            this.stars[s].valid = true;
        }
    }

    for (let s = 0; s < stars_per_ring; s++) {
        this.stars.push(new Star(s * 2 * pi / stars_per_ring));
    }
}


function project (value, z) {
    return value / z * proj_plane_z;
}


function draw_star (z, star) {
    if (z < proj_plane_z) {
        star.valid = false;
        return;
    }

    let proj_x = zoom_ratio * project(star.x, z) + (winwidth / 2);
    let proj_y = zoom_ratio * project(star.y, z) + (winheight / 2);
    let proj_r = zoom_ratio * project(star_radius, z);

    if (z >= 0) {
        var alpha = (1 - (z / farest_z)) * max_brightness;
    } else {
        var alpha = max_brightness;
    }
    var color = 'rgb(0, 255, 255, ' + alpha + ')';

    canvas_ctx.beginPath();
    canvas_ctx.arc(proj_x, proj_y, proj_r, 0, pi * 2, true);
    canvas_ctx.closePath();
    canvas_ctx.fillStyle = color;
    canvas_ctx.fill();
}


function draw_ring (ring) {
    for (let s = 0; s < ring.stars.length; s++) {
        draw_star(ring.z, ring.stars[s]);
    }

    let has_valid_star = false;
    for (let s = 0; s < ring.stars.length; s++) {
        if (ring.stars[s].valid) {
            has_valid_star = true;
            break;
        }
    }

    if (!has_valid_star) {
        ring.valid = false;
    }
}


$(function () {
    // global variables
    canvas = document.getElementById('canvas');
    canvas_ctx = canvas.getContext('2d');

    winwidth = window.innerWidth;
    winheight = window.innerHeight;
    zoom_ratio = Math.min(winwidth, winheight) / ring_radius;

    canvas_ctx.canvas.width  = winwidth;
    canvas_ctx.canvas.height = winheight;

    canvas.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX - winwidth / 2;
        mouse.y = e.clientY - winheight / 2;
    });

    $(window).keyup(function (e) {
        console.log('keyup', e.which);
        switch (e.which) {
            case 32: {
                camera.breaking = !camera.breaking;
                console.log('breaking:', camera.breaking);
                break;
            }
        }
    });

    let rings = []

    function draw_animation_frame () {
        // canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas_ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        canvas_ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (camera.speed < camera_speed_min) {
            camera.speed = camera_speed_min;
        } else if (camera.breaking && camera.speed > camera_speed_min) {
            camera.speed -= camera_break_delta;
        } else if (!camera.breaking && camera.speed < camera_speed_max) {
            camera.speed += camera_break_delta;
        }

        for (let r = 0; r < rings.length; r++) {
            draw_ring(rings[r]);
            rings[r].move();
        }

        camera.z += camera.speed;
        if (camera.z >= ring_interval) {
            let reuse_ring = false;

            for (let r = 0; r < rings.length; r++) {
                if (!rings[r].valid) {
                    rings[r].z = farest_z;
                    rings[r].reactivate();
                    reuse_ring = true;
                    break;
                }
            }
            if (!reuse_ring) {
                rings.push(new Ring(farest_z));
            }
            camera.z = 0;
        }

        raf = window.requestAnimationFrame(draw_animation_frame);
    }

    draw_animation_frame();
});
