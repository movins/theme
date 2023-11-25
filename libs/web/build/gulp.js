const gulp = require('gulp');

// 拷贝声明
gulp.task('declare', async (done) => {
    await gulp.src('../lib/*.d.ts')
        .pipe(gulp.dest('../dist'));
    done();
});

gulp.task('default', gulp.series('declare'));
