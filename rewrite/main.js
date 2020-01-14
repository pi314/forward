// constants
var stars_per_ring = 20;
var tube_twist_scales = 5;
var pi = Math.PI;
var tau = 2 * pi;
var max_z = 120;
var proj_plane_z = 25;
var ring_radius = 10;
var ring_star_radius_ratio = 20;
var ring_interval = Math.floor(ring_radius * 2 * pi / stars_per_ring * 3);
var star_radius = ring_radius / ring_star_radius_ratio;
var max_brightness = 0.9;

var tube_speed_max = 1;
var tube_speed_min = 0;
var tube_speed_change_rate = 0.02;

var bend_angle_max = 2 * pi / 12;


// semi-constants
var canvas = undefined;
var canvas_ctx = undefined;
var winwidth = 0;
var winheight = 0;
var zoom_ratio = 0;


// dynamics
var mouse = {
    x: 0,
    y: 0,
    smooth_x: undefined,
    smooth_y: undefined,
    smooth_rate: 5,
    bend_phase: 0,
    bend_angle: 0,
};
var tube = {
    speed: tube_speed_max,
    offset: 0,
    breaking: false,
    twist_phase: 0,
    twist_dir: 0,
};


if (!Math.hypot) Math.hypot = function (x, y) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=896264#c28
    var max = 0;
    var s = 0;
    for (var i = 0; i < arguments.length; i += 1) {
        var arg = Math.abs(Number(arguments[i]));
        if (arg > max) {
            s *= (max / arg) * (max / arg);
            max = arg;
        }
        s += arg === 0 && max === 0 ? 0 : (arg / max) * (arg / max);
    }
    return max === 1 / 0 ? 1 / 0 : max * Math.sqrt(s);
};


function Star (phase_base) {
    this.phase_base = phase_base;
    this.phase = this.phase_base + tube.twist_phase;
    this.x = ring_radius * Math.cos(this.phase);
    this.y = ring_radius * Math.sin(this.phase);
    this.valid = true;

    this.renew = function () {
        this.valid = true;
        this.phase = this.phase_base + tube.twist_phase;
        this.x = ring_radius * Math.cos(this.phase);
        this.y = ring_radius * Math.sin(this.phase);
    };
}


function Ring () {
    this.stars = [];
    this.z = max_z;
    this.valid = true;

    this.move = function () {
        this.z -= tube.speed;
    };

    this.renew = function () {
        this.z = max_z;
        this.valid = true;
        for (let s = 0; s < stars_per_ring; s++) {
            this.stars[s].renew();
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
    if (z < 0) {
        star.valid = false;
        return;
    }

    let proj_x = star.x;
    let proj_y = star.y;
    let proj_z = z;
    let proj_r = star_radius;

    if (mouse.bend_angle) {
        let bend_radius =
            max_z / mouse.bend_angle -
            ring_radius * Math.cos(star.phase - mouse.bend_phase);
        let star_bend_angle = mouse.bend_angle * z / max_z;
        proj_x += bend_radius * (1 - Math.cos(star_bend_angle)) * Math.cos(mouse.bend_phase);
        proj_y += bend_radius * (1 - Math.cos(star_bend_angle)) * Math.sin(mouse.bend_phase);
        proj_z = bend_radius * Math.sin(star_bend_angle);
    }

    proj_x = project(proj_x, proj_z);
    proj_y = project(proj_y, proj_z);
    proj_r = project(proj_r, proj_z);

    if (proj_z >= 0) {
        var alpha = (1 - (proj_z / max_z)) * max_brightness;
    } else {
        var alpha = max_brightness;
    }
    var color = 'rgb(0, 255, 255, ' + alpha + ')';

    canvas_ctx.beginPath();
    canvas_ctx.arc(
        zoom_ratio * proj_x + (winwidth / 2),
        zoom_ratio * proj_y + (winheight / 2),
        zoom_ratio * proj_r,
        0, pi * 2, true);
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

    canvas.addEventListener('touchmove', function (e) {
        mouse.x = e.changedTouches[0].pageX - winwidth / 2;
        mouse.y = e.changedTouches[0].pageY - winheight / 2;
    });

    $(window).keyup(function (e) {
        console.log('keyup', e.which);
        if (e.which == 32) { // space
            tube.breaking = !tube.breaking;
            console.log('breaking:', tube.breaking);

        } else if (e.which == 37) { // left
            if (tube.twist_dir > -1) {
                tube.twist_dir -= 1;
            }

        } else if (e.which == 39) { // right
            if (tube.twist_dir < 1) {
                tube.twist_dir += 1;
            }
        }
    });

    let rings = []

    function draw_animation_frame () {
        // canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas_ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        canvas_ctx.fillRect(0, 0, canvas.width, canvas.height);

        // update mouse related values
        if (mouse.smooth_x === undefined) {
            mouse.smooth_x = mouse.x;
            mouse.smooth_y = mouse.y;
        } else {
            mouse.smooth_x += (mouse.x - mouse.smooth_x) / mouse.smooth_rate;
            mouse.smooth_y += (mouse.y - mouse.smooth_y) / mouse.smooth_rate;
        }

        mouse.bend_phase = Math.atan2(mouse.smooth_y, mouse.smooth_x);
        mouse.bend_angle = Math.hypot(mouse.smooth_x, mouse.smooth_y) /
            Math.hypot(winwidth / 2, winheight / 2) *
            bend_angle_max;

        if (tube.speed < tube_speed_min) {
            tube.speed = tube_speed_min;
        } else if (tube.breaking && tube.speed > tube_speed_min) {
            tube.speed -= tube_speed_change_rate;
        } else if (!tube.breaking && tube.speed < tube_speed_max) {
            tube.speed += tube_speed_change_rate;
        }

        for (let r = 0; r < rings.length; r++) {
            draw_ring(rings[r]);
            rings[r].move();
        }

        tube.offset += tube.speed;
        if (tube.offset >= ring_interval) {
            let reuse_ring = false;

            tube.twist_phase += tube.twist_dir * (tau / stars_per_ring / tube_twist_scales);
            if (tube.twist_phase <= -tau) {
                tube.twist_phase += tau;
            }
            if (tube.twist_phase >= tau) {
                tube.twist_phase -= tau;
            }

            for (let r = 0; r < rings.length; r++) {
                if (!rings[r].valid) {
                    rings[r].renew();
                    reuse_ring = true;
                    break;
                }
            }
            if (!reuse_ring) {
                rings.push(new Ring());
            }

            tube.offset = 0;
        }

        raf = window.requestAnimationFrame(draw_animation_frame);
    }

    draw_animation_frame();
});
