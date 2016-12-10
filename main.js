$(function () {
    var width = $(window).width();
    var height = $(window).height();
    var screen_z = height;
    var star_plane = (width + height) * 2;
    console.log(width, height, screen_z);

    var stars = [];
    var steps = 0;

    $(window).resize(function () {
        width = $(window).width();
        height = $(window).height();
        screen_z = height;
        star_plane = (width + height) * 2;
        console.log(width, height, screen_z);
    });

    function generate_stars () {
        for (var i = 0; i < 50; i++) {
            var theta = Math.random();
            stars.push({
                dom: $('<div id="star-'+ i +'" class="star">'),
                x: Math.cos(theta * 2 * Math.PI) * (width + height) / 2,
                y: Math.sin(theta * 2 * Math.PI) * (width + height) / 2,
                z: 100,
                trash: false,
            });
            $('#container').append(stars[stars.length - 1].dom);
        }
    }

    function animate () {
        steps = (steps + 1) % 30;
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
                star.dom.css({
                    top: proj_top,
                    left: proj_left,
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
