#import <Cocoa/Cocoa.h>
#import <IOBluetooth/IOBluetooth.h>
#import <IOBluetoothUI/IOBluetoothUI.h>
#import <CoreBluetooth/CoreBluetooth.h>

// Native macOS reader for the existing JDY-31-SPP firmware. No flashing,
// module AT commands, calibration commands, or synthetic measurements.
@interface ScaleReader : NSObject <NSApplicationDelegate, IOBluetoothDeviceInquiryDelegate,
    IOBluetoothDevicePairDelegate, IOBluetoothRFCOMMChannelDelegate, CBCentralManagerDelegate>
@property NSWindow *window;
@property NSTextView *view;
@property IOBluetoothDeviceInquiry *inquiry;
@property IOBluetoothDevicePair *pair;
@property IOBluetoothDevice *device;
@property IOBluetoothRFCOMMChannel *channel;
@property NSMutableArray<IOBluetoothDevice *> *candidates;
@property NSFileHandle *events;
@property NSFileHandle *raw;
@property NSString *directory;
@property BOOL connected;
@property CBCentralManager *bluetoothState;
@end

@implementation ScaleReader
- (void)record:(NSString *)event fields:(NSDictionary *)fields {
    NSMutableDictionary *row = [fields mutableCopy] ?: [NSMutableDictionary dictionary];
    row[@"event"] = event;
    row[@"time"] = @([[NSDate date] timeIntervalSince1970]);
    row[@"simulation"] = @NO;
    NSData *json = [NSJSONSerialization dataWithJSONObject:row options:0 error:nil];
    [self.events writeData:json];
    [self.events writeData:[@"\n" dataUsingEncoding:NSUTF8StringEncoding]];
    NSString *text = [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding];
    [self.view.textStorage appendAttributedString:[[NSAttributedString alloc] initWithString:
        [text stringByAppendingString:@"\n"]]];
    [self.view scrollRangeToVisible:NSMakeRange(self.view.string.length, 0)];
}
- (void)applicationDidFinishLaunching:(NSNotification *)note {
    NSString *base = [[[NSBundle mainBundle] bundlePath] stringByDeletingLastPathComponent];
    self.directory = [base stringByAppendingPathComponent:@"physical"];
    [[NSFileManager defaultManager] createDirectoryAtPath:self.directory
        withIntermediateDirectories:YES attributes:nil error:nil];
    NSString *stamp = [NSString stringWithFormat:@"%.0f", [[NSDate date] timeIntervalSince1970]];
    NSString *log = [self.directory stringByAppendingPathComponent:
        [@"bluetooth-events-" stringByAppendingFormat:@"%@.jsonl", stamp]];
    NSString *raw = [self.directory stringByAppendingPathComponent:
        [@"bluetooth-received-" stringByAppendingFormat:@"%@.bin", stamp]];
    [[NSFileManager defaultManager] createFileAtPath:log contents:nil attributes:nil];
    [[NSFileManager defaultManager] createFileAtPath:raw contents:nil attributes:nil];
    self.events = [NSFileHandle fileHandleForWritingAtPath:log];
    self.raw = [NSFileHandle fileHandleForWritingAtPath:raw];
    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0,0,880,520)
        styleMask:NSWindowStyleMaskTitled|NSWindowStyleMaskClosable|NSWindowStyleMaskResizable
        backing:NSBackingStoreBuffered defer:NO];
    self.window.title = @"Health Scale — real Bluetooth data (no flashing)";
    NSButton *retry = [NSButton buttonWithTitle:@"Read paired JDY-31-SPP" target:self
        action:@selector(readPairedDevice:)];
    retry.frame = NSMakeRect(12, 483, 230, 28);
    retry.autoresizingMask = NSViewMinYMargin;
    [self.window.contentView addSubview:retry];
    NSButton *scan = [NSButton buttonWithTitle:@"Scan classic JDY-31-SPP" target:self
        action:@selector(scanClassic:)];
    scan.frame = NSMakeRect(255, 483, 230, 28);
    scan.autoresizingMask = NSViewMinYMargin;
    [self.window.contentView addSubview:scan];
    NSButton *choose = [NSButton buttonWithTitle:@"Choose JDY-31-SPP…" target:self
        action:@selector(selectDevice)];
    choose.frame = NSMakeRect(500, 483, 230, 28);
    choose.autoresizingMask = NSViewMinYMargin;
    [self.window.contentView addSubview:choose];
    NSScrollView *scroll = [[NSScrollView alloc] initWithFrame:NSMakeRect(0,0,880,475)];
    scroll.autoresizingMask = NSViewWidthSizable|NSViewHeightSizable;
    scroll.hasVerticalScroller = YES;
    self.view = [[NSTextView alloc] initWithFrame:scroll.bounds];
    self.view.editable = NO;
    self.view.font = [NSFont monospacedSystemFontOfSize:12 weight:NSFontWeightRegular];
    self.view.autoresizingMask = NSViewWidthSizable;
    scroll.documentView = self.view;
    [self.window.contentView addSubview:scroll];
    [self.window center];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
    [self record:@"reader_started" fields:@{@"target":@"JDY-31-SPP", @"mode":@"passive_receive"}];
    [self record:@"bluetooth_authorization" fields:@{@"authorization":@([CBManager authorization]),
        @"classic_power":@([IOBluetoothHostController defaultController].powerState)}];
    // Request the normal app Bluetooth authorization and observe state only.
    // No BLE scan is started; the scale itself uses classic SPP.
    self.bluetoothState = [[CBCentralManager alloc] initWithDelegate:self queue:nil
        options:@{CBCentralManagerOptionShowPowerAlertKey:@NO}];
    self.candidates = [NSMutableArray array];
    [self performSelector:@selector(readPairedDevice:) withObject:nil afterDelay:0];
    [NSTimer scheduledTimerWithTimeInterval:55 target:self selector:@selector(watchdog:)
        userInfo:nil repeats:NO];
}
- (void)centralManagerDidUpdateState:(CBCentralManager *)central {
    [self record:@"bluetooth_state" fields:@{@"state":@(central.state),
        @"authorization":@([CBManager authorization]),
        @"classic_power":@([IOBluetoothHostController defaultController].powerState)}];
}
- (void)scanClassic:(id)sender {
    if (self.channel || self.pair || self.inquiry) {
        [self record:@"scan_or_connection_already_started" fields:nil];
        return;
    }
    [self.candidates removeAllObjects];
    self.inquiry = [IOBluetoothDeviceInquiry inquiryWithDelegate:self];
    self.inquiry.searchType = kIOBluetoothDeviceSearchClassic;
    self.inquiry.inquiryLength = 10;
    self.inquiry.updateNewDeviceNames = NO;
    IOReturn status = [self.inquiry start];
    [self record:@"explicit_classic_inquiry_start" fields:@{@"status":@(status),
        @"search_type":@(self.inquiry.searchType)}];
}
- (void)readPairedDevice:(id)sender {
    if (self.channel || self.pair) {
        [self record:@"connection_already_started" fields:nil];
        return;
    }
    NSMutableArray *matches = [NSMutableArray array];
    for (IOBluetoothDevice *device in [IOBluetoothDevice pairedDevices]) {
        if ([device.name isEqualToString:@"JDY-31-SPP"]) [matches addObject:device];
    }
    [self record:@"paired_target_check" fields:@{@"target_count":@(matches.count)}];
    if (matches.count != 1) return;
    self.device = matches.firstObject;
    [self rememberDevice:self.device];
    [self queryService];
}
- (void)selectDevice {
    if (self.channel || self.pair || self.inquiry) {
        [self record:@"scan_or_connection_already_started" fields:nil];
        return;
    }
    IOBluetoothDeviceSelectorController *picker = [IOBluetoothDeviceSelectorController deviceSelector];
    [picker setOptions:kIOBluetoothServiceBrowserControllerOptionsAutoStartInquiry];
    [picker setTitle:@"Select JDY-31-SPP health scale"];
    [picker setDescriptionText:@"Select only JDY-31-SPP. The reader receives real measurements without flashing or calibration."];
    [picker addAllowedUUID:[IOBluetoothSDPUUID uuid16:0x1101]];
    [picker setPrompt:@"Select JDY-31-SPP"];
    [self record:@"device_selector_started" fields:@{@"required_service":@"0x1101"}];
    int status = [picker runModal];
    [self record:@"device_selector_complete" fields:@{@"status":@(status)}];
    NSArray *devices = [picker getResults];
    [self record:@"device_selector_results" fields:@{@"count":@(devices.count)}];
    if (status != kIOBluetoothUISuccess || devices.count != 1) return;
    IOBluetoothDevice *device = devices.firstObject;
    if (![device.name isEqualToString:@"JDY-31-SPP"]) {
        [self record:@"wrong_target_rejected" fields:nil];
        return;
    }
    [self rememberDevice:device];
    self.device = device;
    [self connectSelectedDevice];
}
- (void)connectSelectedDevice {
    if (self.device.isPaired) { [self queryService]; return; }
    self.pair = [IOBluetoothDevicePair pairWithDevice:self.device];
    self.pair.delegate = self;
    [self record:@"pair_start" fields:@{@"status":@([self.pair start])}];
}
- (void)rememberDevice:(IOBluetoothDevice *)device {
    if (![device.name isEqualToString:@"JDY-31-SPP"]) return;
    if (![self.candidates containsObject:device]) {
        [self.candidates addObject:device];
        [self record:@"target_discovered" fields:@{@"name":device.name,
            @"paired":@(device.isPaired), @"connected":@(device.isConnected)}];
    }
}
- (void)deviceInquiryDeviceFound:(IOBluetoothDeviceInquiry *)sender device:(IOBluetoothDevice *)device {
    [self rememberDevice:device];
}
- (void)deviceInquiryDeviceNameUpdated:(IOBluetoothDeviceInquiry *)sender
    device:(IOBluetoothDevice *)device devicesRemaining:(uint32_t)remaining {
    [self rememberDevice:device];
}
- (void)deviceInquiryComplete:(IOBluetoothDeviceInquiry *)sender error:(IOReturn)error aborted:(BOOL)aborted {
    if (sender != self.inquiry) return;
    for (IOBluetoothDevice *device in sender.foundDevices) [self rememberDevice:device];
    [self record:@"inquiry_complete" fields:@{@"status":@(error), @"aborted":@(aborted),
        @"target_count":@(self.candidates.count)}];
    self.inquiry = nil;
    // A later inquiry/name-resolution failure does not invalidate a target
    // already discovered with the exact requested name. Pair only that target.
    if (aborted || self.candidates.count != 1 || self.pair || self.channel) return;
    self.device = self.candidates.firstObject;
    [self connectSelectedDevice];
}
- (void)devicePairingPINCodeRequest:(id)sender {
    // Use the existing default PIN documented in the supplied module manual.
    BluetoothPINCode pin = {{'1','2','3','4'}};
    [sender replyPINCode:4 PINCode:&pin];
    [self record:@"existing_default_pin_used" fields:nil];
}
- (void)devicePairingUserConfirmationRequest:(id)sender numericValue:(BluetoothNumericValue)value {
    // Numeric comparison needs the human to compare both devices.
    [self record:@"numeric_comparison_requires_user" fields:@{@"value":@(value)}];
    [sender replyUserConfirmation:NO];
}
- (void)devicePairingFinished:(id)sender error:(IOReturn)error {
    [self record:@"pair_complete" fields:@{@"status":@(error), @"paired":@(self.device.isPaired)}];
    self.pair = nil;
    if (!error) [self queryService];
}
- (void)queryService {
    IOReturn status = [self.device performSDPQuery:self];
    [self record:@"sdp_start" fields:@{@"status":@(status)}];
}
- (void)sdpQueryComplete:(IOBluetoothDevice *)device status:(IOReturn)status {
    [self record:@"sdp_complete" fields:@{@"status":@(status)}];
    if (status) return;
    IOBluetoothSDPServiceRecord *service = [device getServiceRecordForUUID:
        [IOBluetoothSDPUUID uuid16:0x1101]];
    BluetoothRFCOMMChannelID channelID = 0;
    IOReturn result = service ? [service getRFCOMMChannelID:&channelID] : kIOReturnNotFound;
    [self record:@"spp_service" fields:@{@"status":@(result), @"channel":@(channelID)}];
    if (result) return;
    IOBluetoothRFCOMMChannel *channel = nil;
    result = [device openRFCOMMChannelAsync:&channel withChannelID:channelID delegate:self];
    self.channel = channel;
    [self record:@"rfcomm_start" fields:@{@"status":@(result)}];
}
- (void)rfcommChannelOpenComplete:(IOBluetoothRFCOMMChannel *)channel status:(IOReturn)status {
    self.connected = (status == kIOReturnSuccess);
    [self record:@"rfcomm_open" fields:@{@"status":@(status)}];
}
- (void)rfcommChannelData:(IOBluetoothRFCOMMChannel *)channel data:(void *)bytes length:(size_t)length {
    NSData *data = [NSData dataWithBytes:bytes length:length];
    [self.raw writeData:data];
    NSMutableString *hex = [NSMutableString stringWithCapacity:length*2];
    for (size_t i=0;i<length;i++) [hex appendFormat:@"%02x", ((uint8_t *)bytes)[i]];
    NSStringEncoding gbk = CFStringConvertEncodingToNSStringEncoding(kCFStringEncodingGB_18030_2000);
    NSString *text = [[NSString alloc] initWithData:data encoding:gbk];
    [self record:@"receive" fields:@{@"bytes":@(length), @"hex":hex,
        @"gb18030_chunk":text ?: @"[partial multibyte sequence; see raw .bin]"}];
}
- (void)rfcommChannelClosed:(IOBluetoothRFCOMMChannel *)channel {
    self.connected = NO;
    [self record:@"rfcomm_closed" fields:nil];
}
- (void)watchdog:(NSTimer *)timer {
    [self record:@"observation_55s" fields:@{@"rfcomm_connected":@(self.connected)}];
}
- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender { return YES; }
- (void)applicationWillTerminate:(NSNotification *)note {
    [self.inquiry stop];
    [self.channel closeChannel];
    [self.events closeFile];
    [self.raw closeFile];
}
@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        ScaleReader *reader = [ScaleReader new];
        app.delegate = reader;
        [app run];
    }
    return 0;
}
