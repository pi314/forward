$(function () {
    let mouse_x = 0;
    let mouse_y = 0;
    let aprx_x = 0;
    let aprx_y = 0;
    let smooth_rate = 5;
    let frame_rate = 30;
    let frame_per_rings = 10;
    let frame_num = 0;
    let ring_pattern_period = 5;
    let stars_per_ring = 20;
    let ring_num = 0;
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

                let proj_top = proj_y * (vm.screen / (star.z / 100 * vm.star_plane)) + vm.height / 2;
                let proj_left = proj_x * (vm.screen / (star.z / 100 * vm.star_plane)) + vm.width / 2;
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
            screen: function () {
                return Math.min(vm.width, vm.height);
            },
            star_plane: function () {
                return (vm.width + vm.height) * 2;
            },
            ring_radius: function () {
                return Math.min(vm.width, vm.height);
            },
            bend_limit: function () {
                return Math.atan2(vm.width / 2, vm.screen);
            },
            star_size: function () {
                return vm.ring_radius / 40;
            }
        }
    });

    $(window).resize(function () {
        vm.width = $(window).width();
        vm.height = $(window).height();
    });

    $(window).mousemove(function (evt) {
        mouse_x = evt.clientX - vm.width / 2;
        mouse_y = evt.clientY - vm.height / 2;
    });

    function next_step (ring_num) {
        for (var i = 0; i < stars_per_ring; i++) {
            vm.stars.push({
                theta: (i / stars_per_ring) * 2 * Math.PI,
                z: 100,
                trash: false,
            });
        }
    }

    function animate () {
        aprx_x = aprx_x + (mouse_x - aprx_x) / smooth_rate;
        aprx_y = aprx_y + (mouse_y - aprx_y) / smooth_rate;
        vm.bend_phase = Math.atan2(aprx_y, aprx_x);
        vm.bend_rate = Math.sqrt(aprx_x * aprx_x + aprx_y * aprx_y) /
                       Math.sqrt(vm.width * vm.width + vm.height * vm.height) *
                       vm.bend_limit;

        frame_num = (frame_num + 1) % frame_per_rings;
        if (frame_num == 0) {
            ring_num = (ring_num + 1) % ring_pattern_period;
            next_step(ring_num);
        }

        vm.stars.forEach(function (star) {
            star.z -= 1;
        });

        vm.stars = vm.stars.filter(function (x) {
            return !x.trash;
        });

        setTimeout(animate, frame_rate);
    }

    setTimeout(animate, frame_rate);
});
