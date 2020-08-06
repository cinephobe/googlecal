const {src, dest, series, watch} = require('gulp'),
    sass = require('gulp-sass'),
    scss = () => {
        return src('src/scss/*.scss')
            .pipe(sass({outputStyle: 'compressed'}))
            .pipe(dest('dist/css'));
    };

exports.scss = scss;
exports.watch = () => {
    watch('src/scss/**/*.scss', series(scss));
};