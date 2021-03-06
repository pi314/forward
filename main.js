$(function () {
    let mouse = {
        x: 0, y: 0,
        'ex': 0, ey: 0, // Wrap ex with '' to prevent vim modeline error
    };

    let smooth = {
        min: 5,
        max: 50,
        delta: 3,
        rate: 5,
    };

    let speed = {
        min: 0,
        max: 1,
        value: 1,
        delta: 0.1,
    };

    let rotate = {
        period: 4,
        offset: 0,
        direction: 0,
    };

    let frame_interval = 30;
    let frame_per_ring = 10;
    let stars_per_ring = 20;

    let frame_id = 0;
    let breaking = false;

    let vm = new Vue({
        el: '#app',
        data: {
            stars: [],
            width: $(window).width(),
            height: $(window).height(),
            bend_phase: 0,
            bend_rate: 0,
            proj_info: function (star) {
                let proj_x = Math.cos(star.theta) * vm.ring_radius;
                let proj_y = Math.sin(star.theta) * vm.ring_radius;

                if (vm.bend_rate) {
                    let bend_radius = vm.star_plane / Math.sin(vm.bend_rate) +
                                      vm.ring_radius *
                                      Math.cos(star.theta - vm.bend_phase);
                    let bend_angle = 2 * vm.bend_rate * star.z / 100;
                    let zoom_rate = (1 - Math.cos(bend_angle));
                    let x0 = bend_radius * Math.cos(vm.bend_phase);
                    let y0 = bend_radius * Math.sin(vm.bend_phase);
                    proj_x += x0 * zoom_rate;
                    proj_y += y0 * zoom_rate;
                }

                let proj_top = proj_y * (vm.screen_size_ind / (star.z / 100 * vm.star_plane)) + vm.height / 2;
                let proj_left = proj_x * (vm.screen_size_ind / (star.z / 100 * vm.star_plane)) + vm.width / 2;
                let proj_width = (100 - star.z) / 2 + vm.star_size;
                if (proj_top < -vm.width || proj_top > vm.height * 2
                        || proj_left < -vm.width || proj_left > vm.width * 2
                        || star.z < 0) {
                    star.trash = true;
                }
                return {
                    top: (proj_top - proj_width / 2) + 'px',
                    left: (proj_left - proj_width / 2) + 'px',
                    width: proj_width + 'px',
                    height: proj_width + 'px',
                    'border-radius': (proj_width / 2) + 'px',
                    opacity: 1 - (star.z / 100),
                };
            },
        },
        computed: {
            screen_size_ind: function () {
                return Math.min(vm.width, vm.height);
            },
            star_plane: function () {
                return (vm.width + vm.height) * 2;
            },
            ring_radius: function () {
                return Math.min(vm.width, vm.height);
            },
            bend_limit: function () {
                return Math.atan2(vm.width / 2, vm.screen_size_ind);
            },
            star_size: function () {
                return vm.ring_radius / 40;
            },
        },
    });

    $(window).resize(function () {
        vm.width = $(window).width();
        vm.height = $(window).height();
    });

    $(window).mousemove(function (evt) {
        mouse.x = evt.clientX - vm.width / 2;
        mouse.y = evt.clientY - vm.height / 2;
    });

    $(window).keyup(function (evt) {
        console.log(evt.which);
        switch (evt.which) {
            case 32: {
                breaking = !breaking;
                if (!breaking && speed.value == speed.min) {
                    setTimeout(animate, frame_interval);
                }
                break;
            }
            case 37: {
                rotate.direction -= 1;
                rotate.direction = (rotate.direction < -1) ? -1 : rotate.direction;
                break;
            }
            case 39: {
                rotate.direction += 1;
                rotate.direction = (rotate.direction > 1) ? 1 : rotate.direction;
                break;
            }
        }
    });

    function new_ring () {
        let unit = 1 / stars_per_ring;
        for (var i = 0; i < stars_per_ring; i++) {
            vm.stars.push({
                theta: (unit * (i + rotate.offset / rotate.period)) * 2 * Math.PI,
                z: 100,
                trash: false,
            });
        }

        rotate.offset = (rotate.offset + rotate.direction) % rotate.period;
    }

    function animate () {
        mouse.ex = mouse.ex + (mouse.x - mouse.ex) / smooth.rate;
        mouse.ey = mouse.ey + (mouse.y - mouse.ey) / smooth.rate;
        vm.bend_phase = Math.atan2(mouse.ey, mouse.ex);
        vm.bend_rate = Math.sqrt(mouse.ex * mouse.ex + mouse.ey * mouse.ey) /
                       Math.sqrt(vm.width * vm.width + vm.height * vm.height) *
                       vm.bend_limit;

        frame_id = (frame_id + 1) % frame_per_ring;
        if (frame_id == 0) {
            new_ring();
        }

        vm.stars.forEach(function (star) {
            star.z -= speed.value;
        });

        vm.stars = vm.stars.filter(function (x) {
            return !x.trash;
        });

        if (breaking) {
            speed.value -= speed.delta;
            speed.value = (speed.value < speed.min) ? speed.min : speed.value;
            smooth.rate += smooth.delta;
            smooth.rate = (smooth.rate > smooth.max) ? smooth.max : smooth.rate;
        } else {
            speed.value += speed.delta;
            speed.value = (speed.value > speed.max) ? speed.max : speed.value;
            smooth.rate -= smooth.delta;
            smooth.rate = (smooth.rate < smooth.min) ? smooth.min : smooth.rate;
        }

        if (speed.value > speed.min) {
            setTimeout(animate, frame_interval);
        }
    }

    setTimeout(animate, frame_interval);
});
