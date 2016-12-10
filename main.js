$(function () {
    let vm = new Vue({
        el: '#app',
        data: {
            frame_rate: 30,
            stars: [],
            width: $(window).width(),
            height: $(window).height(),
            steps: 0,
            proj_info: function (star) {
                let proj_width = (100 - star.z) / 2 + 20;
                let proj_top = (star.y * (vm.screen_z / (star.z / 100 * vm.star_plane)) + vm.height / 2);
                let proj_left = (star.x * (vm.screen_z / (star.z / 100 * vm.star_plane)) + vm.width / 2);
                if (proj_top < -proj_width || proj_top > vm.height + proj_width
                        || proj_left < -proj_width || proj_left > vm.width + proj_width) {
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
            screen_z: function () {
                return Math.min(vm.width, vm.height);
            },
            star_plane: function () {
                return (vm.width + vm.height) * 2;
            },
            stars_per_ring: function () {
                return 20;
            },
            gap_between_ring: function () {
                return 10;
            },
            ring_radius: function () {
                return (vm.width + vm.height) / 2;
            },
        }
    });

    $(window).resize(function () {
        vm.width = $(window).width();
        vm.height = $(window).height();
    });

    function generate_stars () {
        for (var i = 0; i < vm.stars_per_ring; i++) {
            vm.stars.push({
                x: Math.cos(i / vm.stars_per_ring * 2 * Math.PI) * vm.ring_radius,
                y: Math.sin(i / vm.stars_per_ring * 2 * Math.PI) * vm.ring_radius,
                z: 100,
                trash: false,
            });
        }
    }

    function animate () {
        vm.steps = (vm.steps + 1) % vm.gap_between_ring;
        if (vm.steps == 0) {
            generate_stars();
        }

        vm.stars.forEach(function (star) {
            star.z -= 1;
        });

        vm.stars = vm.stars.filter(function (x) {
            return !x.trash;
        });

        setTimeout(animate, vm.frame_rate);
    }

    generate_stars();

    setTimeout(animate, vm.frame_rate);
});
