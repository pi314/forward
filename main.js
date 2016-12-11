$(function () {
    let vm = new Vue({
        el: '#app',
        data: {
            frame_rate: 30,
            frame_per_rings: 10,
            frame_num: 0,
            ring_pattern_period: 5,
            ring_num: 0,
            stars_per_ring: 20,
            stars: [],
            width: $(window).width(),
            height: $(window).height(),
            bend_angle_x: 0,
            bend_angle_y: 0,
            warp_rate: 1.5,
            proj_info: function (star) {
                let bend_radius_x = Math.sin(-vm.bend_angle_x) * vm.star_plane;
                let bend_z_angle_x = 2 * vm.bend_angle_x * star.z / 100;
                let proj_x = (Math.cos(star.theta) * vm.ring_radius +
                              bend_radius_x) *
                              Math.cos(bend_z_angle_x) - bend_radius_x;

                let bend_radius_y = Math.sin(-vm.bend_angle_y) * vm.star_plane;
                let bend_z_angle_y = 2 * vm.bend_angle_y * star.z / 100;
                let proj_y = (Math.sin(star.theta) * vm.ring_radius +
                              bend_radius_y) *
                              Math.cos(bend_z_angle_y) - bend_radius_y;

                let proj_top = (proj_y * (vm.screen / (star.z / 100 * vm.star_plane)) + vm.height / 2);
                let proj_left = (proj_x * (vm.screen / (star.z / 100 * vm.star_plane)) + vm.width / 2);
                let proj_width = (100 - star.z) / 2 + 20;
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
                return Math.atan(vm.width / 2, screen);
            },
        }
    });

    $(window).resize(function () {
        vm.width = $(window).width();
        vm.height = $(window).height();
    });

    $(window).mousemove(function (evt) {
        let mouse_x = evt.clientX - vm.width / 2;
        let mouse_y = evt.clientY - vm.height / 2;
        vm.bend_angle_x = (mouse_x / vm.width / vm.warp_rate) * vm.bend_limit;
        vm.bend_angle_y = (mouse_y / vm.height / vm.warp_rate) * vm.bend_limit;
    });

    function next_step (ring_num) {
        for (var i = 0; i < vm.stars_per_ring; i++) {
            vm.stars.push({
                theta: (i / vm.stars_per_ring) * 2 * Math.PI,
                // theta: ((i + (ring_num / vm.ring_pattern_period)) / vm.stars_per_ring) * 2 * Math.PI,
                // theta: ((i) / vm.stars_per_ring) * 2 * Math.PI + vm.mouse_theta,
                z: 100,
                trash: false,
            });
        }
    }

    function animate () {
        vm.frame_num = (vm.frame_num + 1) % vm.frame_per_rings;
        if (vm.frame_num == 0) {
            vm.ring_num = (vm.ring_num + 1) % vm.ring_pattern_period;
            next_step(vm.ring_num);
        }

        vm.stars.forEach(function (star) {
            star.z -= 1;
        });

        vm.stars = vm.stars.filter(function (x) {
            return !x.trash;
        });

        setTimeout(animate, vm.frame_rate);
    }

    setTimeout(animate, vm.frame_rate);
});
