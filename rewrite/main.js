// ----------------------------------------------------------------------------
// constants: values that should not be changed

const stars_per_ring = 20;
const tube_twist_scales = 5;
const pi = Math.PI;
const tau = 2 * pi;
const proj_plane_z = 25;
const ring_radius = 10;
const ring_star_radius_ratio = 20;
const ring_interval = Math.floor(ring_radius * 2 * pi / stars_per_ring * 3);
const star_radius = ring_radius / ring_star_radius_ratio;
const star_max_alpha = 0.9;

const tube_speed_max = 1;
const tube_speed_min = 0;
const tube_speed_change_rate = 0.02;
const tube_trailing_opacity_min = 0.3;
const tube_trailing_opacity_max = 1;
const tube_trailing_opacity_change_rate = 0.01;
const tube_hue_init = 180;
const tube_hue_change_delta = 30;
const tube_bend_angle_max = 2 * pi / 12;

const palette_touch_radious = 25;
const palette_hue_inner_radius = palette_touch_radious * 2;
const palette_hue_outer_radius = palette_touch_radious * 3;
const palette_curr_hue_ind_thickness = (palette_touch_radious + palette_hue_inner_radius) / 2;
const palette_hue_rotate_init = 240 + tube_hue_init;
const palette_charge_time = ring_interval * 2;
const PaletteState = Object.freeze({
    idle: 0,
    charging: 1,
    activated: 2,
    discharging: 3,
});


// Semi-constants:
// values that may change by special events
// but should be treated to as read-only
var canvas = undefined;
var canvas_ctx = undefined;
var winwidth = undefined;
var winheight = undefined;
var new_winwidth = undefined;
var new_winheight = undefined;
var zoom_ratio = 0;

var palette_center_x = undefined;
var palette_center_y = undefined;


// dynamics, or contexts
var mouse = {
    origin_x: 0,
    origin_y: 0,
    smooth_x: undefined,
    smooth_y: undefined,
    smooth_rate: 5,
};
var tube = {
    max_z: 150,
    trailing: false,
    trailing_opacity: 1,
    speed: tube_speed_max,
    z: 0,
    bend_phase: 0,
    bend_angle: 0,
    breaking: false,
    twist_phase: 0,
    twist_dir: 0,
    hue: tube_hue_init,
    aperture: false,
    aperture_gen_clock: 0,
    aperture_move_clock: 0,
    aperture_interval: undefined,
};
tube.aperture_interval = Math.floor(tube.max_z * 1.5);

let ongoing_gestures = {}
let finished_gestures = [];

var palette = {
    state: PaletteState.idle,
    pop_out_ratio: 0,
    trigger_touch: undefined,
    charging_clock: 0,
    hue_rotate_base: palette_hue_rotate_init,
    rotating_touch: undefined,
    rotating_from_x: 0,
    rotating_from_y: 0,
    rotating_to_x: 0,
    rotating_to_y: 0,
};

var rings = [];

var log_enable = false;


// ----------------------------------------------------------------------------


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


// ----------------------------------------------------------------------------
// Models (class definission)

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
    this.z = tube.max_z;
    this.valid = true;
    this.hue = tube.hue;
    this.bright = false;

    this.move = function () {
        this.z -= tube.speed;
    };

    this.renew = function () {
        this.valid = true;
        this.z = tube.max_z;
        for (let s = 0; s < stars_per_ring; s++) {
            this.stars[s].renew();
        }
        this.hue = tube.hue;
        this.bright = false;
    }

    for (let s = 0; s < stars_per_ring; s++) {
        this.stars.push(new Star(s * 2 * pi / stars_per_ring));
    }
}
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// Animation calculations

function draw_star (ring, star) {
    if (ring.z < 0) {
        star.valid = false;
        return;
    }

    let proj_x = star.x;
    let proj_y = star.y;
    let proj_z = ring.z;
    let proj_r = star_radius;

    if (tube.bend_angle) {
        let bend_radius =
            tube.max_z / tube.bend_angle -
            ring_radius * Math.cos(star.phase - tube.bend_phase);
        let star_bend_angle = tube.bend_angle * ring.z / tube.max_z;
        proj_x += bend_radius * (1 - Math.cos(star_bend_angle)) * Math.cos(tube.bend_phase);
        proj_y += bend_radius * (1 - Math.cos(star_bend_angle)) * Math.sin(tube.bend_phase);
        proj_z = bend_radius * Math.sin(star_bend_angle);
    }

    function project (value, z) {
        return value / z * proj_plane_z;
    }

    proj_x = project(proj_x, proj_z);
    proj_y = project(proj_y, proj_z);
    proj_r = project(proj_r, proj_z);

    if (ring.bright) {
        var alpha = 1;
    } else if (proj_z >= 0) {
        var alpha = (1 - (proj_z / tube.max_z)) * star_max_alpha;
    } else {
        var alpha = star_max_alpha;
    }
    var color = 'hsl(' + ring.hue+ ', 100%, 50%, ' + alpha + ')';

    canvas_ctx.beginPath();
    canvas_ctx.arc(
        zoom_ratio * proj_x + (winwidth / 2),
        zoom_ratio * proj_y + (winheight / 2),
        zoom_ratio * proj_r,
        0, pi * 2);
    canvas_ctx.closePath();
    canvas_ctx.fillStyle = color;
    canvas_ctx.fill();
}


function draw_ring (ring) {
    for (let s = 0; s < ring.stars.length; s++) {
        draw_star(ring, ring.stars[s]);
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


function draw_palette_touch_ind () {
    if (palette.state == PaletteState.charging) {
        canvas_ctx.beginPath();
        canvas_ctx.arc(
            palette_center_x,
            palette_center_y,
            palette_curr_hue_ind_thickness,
            0, tau);
        canvas_ctx.fillStyle = 'hsl(' + tube.hue + ', 100%, 50%, 80%)';
        canvas_ctx.fill();

        canvas_ctx.beginPath();
        canvas_ctx.arc(
            palette_center_x,
            palette_center_y,
            palette_touch_radious,
            0, pi * 2);
        canvas_ctx.fillStyle = 'black';
        canvas_ctx.closePath();
        canvas_ctx.fill();
    } else {
        canvas_ctx.beginPath();
        canvas_ctx.arc(
            palette_center_x,
            palette_center_y,
            palette_touch_radious,
            0, pi * 2);
        canvas_ctx.strokeStyle = 'white';
        canvas_ctx.closePath();
        canvas_ctx.stroke();
    }
}


function draw_palette_hue_ring () {
    var touch_rotate = 0;
    if (palette.rotating_touch !== undefined) {
        let rotating_phase_from = Math.atan2(
            palette.rotating_from_y - palette_center_y,
            palette.rotating_from_x - palette_center_x,
        );
        let rotating_phase_to = Math.atan2(
            palette.rotating_to_y - palette_center_y,
            palette.rotating_to_x - palette_center_x,
        );
        let rotating_delta = rotating_phase_from - rotating_phase_to;

        touch_rotate = rotating_delta;

        tube.hue = palette.hue_rotate_base - rotating_delta_to_hue_delta(rotating_delta) - 240;
    }

    let th = palette_curr_hue_ind_thickness;

    canvas_ctx.beginPath();
    canvas_ctx.moveTo(
        palette_center_x + th * Math.sin(tau / 24),
        palette_center_y - th,
    );
    canvas_ctx.lineTo(
        palette_center_x + palette_hue_inner_radius / 1.5,
        palette_center_y - palette_hue_inner_radius / 1.5);
    canvas_ctx.lineTo(
        palette_center_x + th,
        palette_center_y - th * Math.sin(tau / 24)
    );
    canvas_ctx.arc(
        palette_center_x,
        palette_center_y,
        th,
        0, -pi / 2);
    canvas_ctx.fillStyle = 'hsl(' + tube.hue + ', 100%, 50%, 80%)';
    canvas_ctx.fill();

    let x = palette_center_x;
    let y = palette_center_y;
    let ri = palette_hue_inner_radius;
    let ro = palette_hue_inner_radius +
        (palette_hue_outer_radius - palette_hue_inner_radius) * (palette.pop_out_ratio / 5);

    for (let hue = 0; hue < 360; hue += tube_hue_change_delta) {
        let theta_f = (hue) * tau / 360 + touch_rotate;
        let theta_t = (hue + tube_hue_change_delta) * tau / 360 + touch_rotate;

        canvas_ctx.beginPath();
        canvas_ctx.moveTo(ri * Math.sin(theta_f) + x, ri * Math.cos(theta_f) + y);
        canvas_ctx.lineTo(ro * Math.sin(theta_f) + x, ro * Math.cos(theta_f) + y);
        canvas_ctx.lineTo(ro * Math.sin(theta_t) + x, ro * Math.cos(theta_t) + y);
        canvas_ctx.lineTo(ri * Math.sin(theta_t) + x, ri * Math.cos(theta_t) + y);
        canvas_ctx.fillStyle = 'hsl(' + (hue + palette.hue_rotate_base) + ', 100%, 50%, 80%)';
        canvas_ctx.closePath();
        canvas_ctx.fill();

        canvas_ctx.strokeStyle = 'black'
        canvas_ctx.lineWidth = 1;
        canvas_ctx.stroke();
    }

    canvas_ctx.beginPath();
    canvas_ctx.arc(
        palette_center_x,
        palette_center_y,
        palette_touch_radious,
        0, pi * 2);
    canvas_ctx.fillStyle = 'black';
    canvas_ctx.closePath();
    canvas_ctx.fill();
}


function draw_animation_frame () {
    if (tube.trailing) {
        if (tube.trailing_opacity > tube_trailing_opacity_min) {
            tube.trailing_opacity -= tube_trailing_opacity_change_rate;
        }
    } else {
        if (tube.trailing_opacity < tube_trailing_opacity_max) {
            tube.trailing_opacity += tube_trailing_opacity_change_rate;
        }
    }
    canvas_ctx.fillStyle = 'rgba(0, 0, 0, ' + tube.trailing_opacity + ')';
    canvas_ctx.fillRect(0, 0, canvas.width, canvas.height);

    // update mouse related values
    if (mouse.smooth_x === undefined) {
        mouse.smooth_x = mouse.origin_x;
        mouse.smooth_y = mouse.origin_y;
    } else {
        mouse.smooth_x += (mouse.origin_x - mouse.smooth_x) / mouse.smooth_rate;
        mouse.smooth_y += (mouse.origin_y - mouse.smooth_y) / mouse.smooth_rate;
    }

    tube.bend_phase = Math.atan2(mouse.smooth_y, mouse.smooth_x);
    tube.bend_angle = Math.hypot(mouse.smooth_x, mouse.smooth_y) /
        Math.hypot(winwidth / 2, winheight / 2) *
        tube_bend_angle_max;

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

    tube.z += tube.speed;
    if (tube.z >= ring_interval) {
        tube.twist_phase += tube.twist_dir * (tau / stars_per_ring / tube_twist_scales);
        if (tube.twist_phase <= -tau) {
            tube.twist_phase += tau;
        }
        if (tube.twist_phase >= tau) {
            tube.twist_phase -= tau;
        }

        let tail_ring = undefined;

        if (rings.length && !rings[0].valid) {
            tail_ring = rings.shift();
            tail_ring.renew();
        } else {
            tail_ring = new Ring();
        }

        rings.push(tail_ring);

        tube.z = 0;
    }

    tube.aperture_move_clock += tube_speed_max;
    if (tube.aperture_move_clock >= ring_interval) {
        for (let i = 0; i < rings.length; i++) {
            if (rings[i].bright) {
                rings[i].bright = false;
                if (i > 0) {
                    rings[i - 1].bright = true;
                }
            }
        }
        tube.aperture_move_clock = 0;

        if (winwidth != new_winwidth || winheight != new_winheight) {
            update_win_size();
        }
    }

    if (tube.aperture) {
        tube.aperture_gen_clock += tube_speed_max;
        if (tube.aperture_gen_clock >= tube.aperture_interval) {
            if (rings.length) {
                rings[rings.length - 1].bright = true;
            }
            tube.aperture_gen_clock = 0;
        }
    }

    // Only show palette on touch screens
    if ('ontouchstart' in document.documentElement || true) {
        draw_palette_touch_ind();

        if (palette.state == PaletteState.charging) {
            palette.charging_clock += 1;

            if (palette.charging_clock >= palette_charge_time) {
                palette.state = PaletteState.activated;
            }
        } else if (palette.state == PaletteState.activated) {
            if (palette.pop_out_ratio < 5) {
                palette.pop_out_ratio += 1;
            }
            draw_palette_hue_ring();

        } else if (palette.state == PaletteState.discharging) {
            if (palette.pop_out_ratio > 0) {
                palette.pop_out_ratio -= 1;
                draw_palette_hue_ring();
            } else {
                palette.pop_out_ratio = 0;
                palette.state = PaletteState.idle;
                palette.trigger_touch = undefined;
            }

        } else {
            palette.charging_clock = 0;
            palette.pop_out_ratio = 0;
        }
    }

    raf = window.requestAnimationFrame(draw_animation_frame);
}


// ----------------------------------------------------------------------------
// Utility functions

function log (...args) {
    if (!log_enable) return;

    console.log(...args);
}


// From https://codeburst.io/throttling-and-debouncing-in-javascript-b01cad5c8edf
function debounce (func, delay) {
    let debounce_timer = undefined;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(in_debounce);
        debounce_timer = setTimeout(function () {
            func.apply(context, args);
        }, delay);
    };
}


function throttling (func, limit) {
    let in_throttling = false;
    return function () {
        const context = this;
        const args = arguments;
        if (!in_throttling) {
            func.apply(context, args);
            in_throttling = true;
            setTimeout(function () {
                in_throttling = false;
            }, limit);
        }
    };
}


function rotating_delta_to_hue_delta (rotating_delta) {
    let hue_scaled_delta = rotating_delta * 360 / tau / 30;
    let hue_delta = Math.floor(hue_scaled_delta) * 30;

    hue_scaled_delta -= Math.floor(hue_scaled_delta);
    if (Math.abs(hue_scaled_delta) > 0.5) {
        hue_delta += 30 * ((hue_scaled_delta > 0) - (hue_scaled_delta < 0));
    }

    return hue_delta;
}


function show_user_manual () {
    let ctrl = [
        ['[Keyboard Control (for PC)]'],
        ['v', 'enable verbose log'],
        ['space', 'stop/move'],
        ['left/right', 'twist the tube'],
        ['up/down', 'increase/decrease the tube length by ' + 5],
        ['t', 'enable/disable trailing effect'],
        ['a', 'enable/disable aperture'],
        ['c/x', 'increase/decrease hue by ' + tube_hue_change_delta + ' degrees'],
        ['[Hand Gestures (for mobile)]'],
        ['⬇⬇', 'stop/move'],
        ['⬇⬆', 'twist the tube leftwards'],
        ['⬆⬇', 'twist the tube rightwards'],
        ['⬆⬆', 'enable/disable apreture'],
        ['Long click on lower left', 'show hue selection menu']
    ];
    for (let i = 0; i < ctrl.length; i++) {
        let log_str = '%c' + ctrl[i][0];
        let css_config = ['font-weight: bold'];
        if (ctrl[i].length > 1) {
            log_str += '%c: ' + ctrl[i][1];
            css_config.push('')
        }
        console.log(log_str, ...css_config);
    }
}


function array_last (ary) {
    return ary[ary.length - 1];
}


// ----------------------------------------------------------------------------
// Event handling; Parameter change handling


function update_win_size () {
    winwidth = new_winwidth;
    winheight = new_winheight;

    let s = Math.min(winwidth, winheight)

    zoom_ratio = s / ring_radius;

    canvas_ctx.canvas.width  = winwidth;
    canvas_ctx.canvas.height = winheight;

    palette_center_x = s / 5;
    palette_center_y = winheight - (s / 5);
}


function increase_hue () {
    tube.hue = (tube.hue + tube_hue_change_delta) % 360;
}


function decrease_hue () {
    tube.hue = (tube.hue - tube_hue_change_delta + 360) % 360;
}


function toggle_aperture () {
    tube.aperture = !tube.aperture;
    tube.aperture_gen_clock = tube.aperture_interval;
    log('aperture', tube.aperture ? 'enabled' : 'disabled');
}


function toggle_breaking () {
    tube.breaking = !tube.breaking;
    log('breaking:', tube.breaking);
}


function tube_twist (twist_dir_delta) {
    let new_tube_twist_dir = tube.twist_dir + twist_dir_delta;

    if (-1 <= new_tube_twist_dir && new_tube_twist_dir <= 1) {
        tube.twist_dir = new_tube_twist_dir;
    }
}


function keyup (e) {
    let key = e.which;

    log('keyup', key);

    if (key == 86) { // verbose
        log_enable = !log_enable;
        console.log('log', log_enable ? 'enabled' : 'disabled');

    } else if (key == 32) { // space
        toggle_breaking();

    } else if (key == 37) { // left
        tube_twist(-1);

    } else if (key == 39) { // right
        tube_twist(1);

    } else if (key == 38) { // up
        tube.max_z += 5;
        log('max_z:', tube.max_z);
        tube.aperture_interval = Math.floor(tube.max_z * 1.5);

    } else if (key == 40) { // down
        if (tube.max_z > 5) {
            tube.max_z -= 5;
        }
        tube.aperture_interval = Math.floor(tube.max_z * 1.5);
        log('max_z:', tube.max_z);

    } else if (key == 84) { // trailing
        tube.trailing = !tube.trailing;
        log('trailing', tube.trailing ? 'enabled' : 'disabled');

    } else if (key == 65) { // aperture
        toggle_aperture();

    } else if (key == 67) { // color
        increase_hue();

    } else if (key == 88) { // color
        decrease_hue();
    }
}


function pointermove (e) {
    e.preventDefault();
    mouse.origin_x = e.clientX - winwidth / 2
    mouse.origin_y = e.clientY - winheight / 2
}


// ----------------------------------------------------------------------------
// Hand gesture for mobile

// Two gestures are defined.
// For basic gestures, the screen is divided into 4 pieces:
// - Top-right (RT)
// - Top-left (LT)
// - Bottom-right (RB)
// - Bottom-left (LB)
// Swipe down on the left side of screen is represented as "LT,LB"


function touch_area (x, y) {
    return (x >= 0 ? 'R' : 'L') + (y >= 0 ? 'B' : 'T');
};


function browser_event_to_my_coord (e) {
    return [e.clientX - winwidth / 2, e.clientY - winheight / 2];
}


function touchstart (e) {
    e.preventDefault();

    let touches = e.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        let touch = touches[i];
        let [touch_x, touch_y] = browser_event_to_my_coord(touch);

        ongoing_gestures[touch.identifier] = [touch_area(touch_x, touch_y)];
    }

    if (Object.keys(ongoing_gestures).length == 1 && finished_gestures.length == 0) {
        [mouse.origin_x, mouse.origin_y] = browser_event_to_my_coord(touches[0]);
    }

    if (palette.state == PaletteState.idle || palette.state == PaletteState.discharging) {
        let touch_dist = Math.hypot(
            touches[0].clientX - palette_center_x,
            touches[0].clientY - palette_center_y
        );

        // Trigger palette charging if
        // 1. there's only one touchstart
        // 2. there's only one touch ongoing (which is this one)
        // 3. there's no finished gestures before
        if (touch_dist <= palette_touch_radious &&
                Object.keys(ongoing_gestures).length == 1 &&
                finished_gestures.length == 0) {
            palette.trigger_touch = touches[0].identifier;

            if (palette.state == PaletteState.idle) {
                palette.state = PaletteState.charging;
            } else {
                palette.state = PaletteState.activated;
            }
        }

    } else if (palette.state == PaletteState.charging) {
        palette.state = PaletteState.idle;
        palette.trigger_touch = undefined;

    } else if (palette.state == PaletteState.activated) {
        palette.rotating_touch = touches[0].identifier;
        palette.rotating_from_x = touches[0].clientX;
        palette.rotating_from_y = touches[0].clientY;
        palette.rotating_to_x = palette.rotating_from_x;
        palette.rotating_to_y = palette.rotating_from_y;

    } else if (palette.state == PaletteState.discharging) {
    }
}


function touchmove (e) {
    e.preventDefault();

    let touches = e.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        let touch = touches[i];
        let [touch_x, touch_y] = browser_event_to_my_coord(touch);
        let touch_area_code = touch_area(touch_x, touch_y);

        if (touch_area_code != array_last(ongoing_gestures[touch.identifier])) {
            ongoing_gestures[touch.identifier].push(touch_area_code);
        }

        if (touch.identifier === palette.trigger_touch) {
            let touch_dist = Math.hypot(
                            touch.clientX - palette_center_x,
                            touch.clientY - palette_center_y
                        );
            if (touch_dist > palette_touch_radious) {
                palette.state = PaletteState.discharging;
            }
        } else if (touch.identifier === palette.rotating_touch) {
            palette.rotating_to_x = touch.clientX;
            palette.rotating_to_y = touch.clientY;
        }
    }

    if (Object.keys(ongoing_gestures).length == 1 && finished_gestures.length == 0) {
        [mouse.origin_x, mouse.origin_y] = browser_event_to_my_coord(touches[0]);
    }
}


function touchcancel (e) {
    e.preventDefault();
    let touches = e.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        let touch = touches[i];
        delete ongoing_gestures[touch.identifier];

        if (touch.identifier === palette.trigger_touch) {
            palette.state = PaletteState.discharging;

        } else if (touch.identifier === palette.rotating_touch) {
            palette.rotating_touch = undefined;
        }
    }
}


function touchend (e) {
    e.preventDefault();
    let touches = e.changedTouches;

    for (let i = 0; i < touches.length; i++) {
        let touch = touches[i];
        finished_gestures.push(ongoing_gestures[touch.identifier]);
        delete ongoing_gestures[touch.identifier];

        if (touch.identifier === palette.trigger_touch) {
            palette.state = PaletteState.discharging;

        } else if (touch.identifier === palette.rotating_touch) {
            palette.rotating_touch = undefined;
            let rotating_phase_from = Math.atan2(
                palette.rotating_from_y - palette_center_y,
                palette.rotating_from_x - palette_center_x,
            );
            let rotating_phase_to = Math.atan2(
                palette.rotating_to_y - palette_center_y,
                palette.rotating_to_x - palette_center_x,
            );
            let rotating_delta = rotating_phase_from - rotating_phase_to;

            palette.hue_rotate_base = tube.hue + 240;
        }
    }

    if (Object.keys(ongoing_gestures).length == 0) {
        finished_gestures.sort();

        let parsed_gesture = finished_gestures.map(function (x) {
            return x.join(',');
        }).join(';');
        finished_gestures = [];

        if (parsed_gesture == 'LT,LB;RT,RB') {
            toggle_breaking();

        } else if (parsed_gesture == 'LB,LT;RB,RT') {
            toggle_aperture();

        } else if (parsed_gesture == 'LT,LB;RB,RT') {
            tube_twist(-1);

        } else if (parsed_gesture == 'LB,LT;RT,RB') {
            tube_twist(1);

        } else {
            parsed_gesture = '';
        }

        if (parsed_gesture != '') {
            mouse.origin_x = 0;
            mouse.origin_y = 0;
        }
    }
}


// ----------------------------------------------------------------------------


window.onload = function () {
    // global variables
    canvas = document.getElementById('canvas');
    canvas_ctx = canvas.getContext('2d');

    new_winwidth = window.innerWidth;
    new_winheight = window.innerHeight;

    // I'm not calling update_win_size() here and instead only storing new
    // window size, to prevent heavy calculation triggered on every resize
    // events, which causes lag.
    // New window size will be "noticed" at next important moment.
    window.addEventListener('resize', debounce(function () {
        new_winwidth = window.innerWidth;
        new_winheight = window.innerHeight;
    }, 500));

    document.addEventListener('keyup', keyup);

    // Use pointermove instead of mousemove here.
    // Because mobile browser sometimes trigger 'mousemove' after 'touchend'
    // even with preventDefault(), causes tube-position-reset not working
    document.addEventListener('pointermove', pointermove);

    document.addEventListener('touchstart', touchstart);
    document.addEventListener('touchmove', throttling(touchmove, 20));
    document.addEventListener('touchend', touchend);
    document.addEventListener('touchcancel', touchcancel);

    update_win_size();

    show_user_manual();

    draw_animation_frame();
};
