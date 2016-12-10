$(function () {
    var width = $(window).width();
    var height = $(window).height();
    var screen_z = height;
    var star_plane = (width + height) * 2;
    var stars_per_ring = 20;
    var gap_between_ring = 10;
    var ring_radius = (width + height) / 2;
    console.log(width, height, screen_z);

    var stars = [];
    var steps = 0;

    $(window).resize(function () {
        width = $(window).width();
        height = $(window).height();
        screen_z = height;
        star_plane = (width + height) * 2;
        ring_radius = (width + height) / 2;
        console.log(width, height, screen_z);
    });

    function generate_stars () {
        for (var i = 0; i < stars_per_ring; i++) {
            stars.push({
                dom: $('<div id="star-'+ i +'" class="star">'),
                x: Math.cos(i / stars_per_ring * 2 * Math.PI) * ring_radius,
                y: Math.sin(i / stars_per_ring * 2 * Math.PI) * ring_radius,
                z: 100,
                trash: false,
            });
            $('#container').append(stars[stars.length - 1].dom);
        }
    }

    function animate () {
        steps = (steps + 1) % gap_between_ring;
        if (steps == 0) {
            generate_stars();
        }

        stars.forEach(function (star) {
            star.z -= 1;
            var proj_top = star.y * (screen_z / (star.z / 100 * star_plane)) + height / 2;
            var proj_left = star.x * (screen_z / (star.z / 100 * star_plane)) + width / 2;
            if (proj_top < -50 || proj_top > height + 50 ||
                    proj_left < -50 || proj_left > width + 50) {
                star.trash = true;
                star.dom.remove();
            } else {
                var proj_width = (100 - star.z) / 2 + 20;
                star.dom.css({
                    top: proj_top - proj_width / 2,
                    left: proj_left - proj_width / 2,
                    width: proj_width,
                    height: proj_width,
                    'border-radius': proj_width / 2,
                    opacity: 1 - (star.z / 100),
                });
            }
        });

        stars = stars.filter(function (x) {
            return !x.trash;
        });

        setTimeout(animate, 30);
    }

    generate_stars();

    setTimeout(animate, 1);
});
