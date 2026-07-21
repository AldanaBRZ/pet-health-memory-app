#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 3) {
            fprintf(stderr, "Usage: transcode_video <input.avi> <output.mp4>\n");
            return 2;
        }

        NSString *inputPath = [NSString stringWithUTF8String:argv[1]];
        NSString *outputPath = [NSString stringWithUTF8String:argv[2]];
        NSURL *inputURL = [NSURL fileURLWithPath:inputPath];
        NSURL *outputURL = [NSURL fileURLWithPath:outputPath];
        AVURLAsset *asset = [AVURLAsset URLAssetWithURL:inputURL options:nil];

        AVAssetExportSession *exportSession = [[AVAssetExportSession alloc]
            initWithAsset:asset
            presetName:AVAssetExportPreset1280x720];
        if (exportSession == nil) {
            fprintf(stderr, "Could not create the H.264 export session.\n");
            return 1;
        }
        if (![exportSession.supportedFileTypes containsObject:AVFileTypeMPEG4]) {
            fprintf(stderr, "This system cannot export the source as MPEG-4.\n");
            return 1;
        }

        [[NSFileManager defaultManager] removeItemAtURL:outputURL error:nil];
        exportSession.outputURL = outputURL;
        exportSession.outputFileType = AVFileTypeMPEG4;
        exportSession.shouldOptimizeForNetworkUse = YES;
        exportSession.metadata = @[];

        dispatch_semaphore_t completed = dispatch_semaphore_create(0);
        [exportSession exportAsynchronouslyWithCompletionHandler:^{
            dispatch_semaphore_signal(completed);
        }];

        while (dispatch_semaphore_wait(completed, dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC)) != 0) {
            fprintf(stdout, "Encoding: %.0f%%\n", exportSession.progress * 100);
            fflush(stdout);
        }

        if (exportSession.status != AVAssetExportSessionStatusCompleted) {
            fprintf(
                stderr,
                "Video export failed: %s\n",
                exportSession.error.localizedDescription.UTF8String ?: "unknown error"
            );
            return 1;
        }

        fprintf(stdout, "Created %s\n", outputPath.UTF8String);
        return 0;
    }
}
