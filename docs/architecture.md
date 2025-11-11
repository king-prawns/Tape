## Architecture

### Tape

Tape is a class that expose all the public API for the client.

### Engine

The Engine is basically the “heart” of this application.
The Engine implements the logic of the public API, create the Media Souce and instantiates some important like: State Manager, Emitter, Manifest Downloader and Stream Manager.

### State Manager

The State Manager handle the player state.
It listens for some event from the HTMLVideoElement and it emit the player state through the Dispatcher.

### Emitter

The Emitter listens for all the native events from the HTMLVideoElement and it emit them through the Dispatcher.

### Manifest Downloader

The Manifest Downloader download the manifest and instanciates the Manifest Parser.

### Manifest Parser

The Manifest Parser choose the right parser based on the downloaded manifest.

### DASH Parser

The DASH Parser is responsible for parsing the DASH Parser.

### Stream Manager

The Stream Manager received the parsed manifest and it creates a Period Stream for each period present in the manifest.
It also instanciates the Download Manager, the Buffer Manager, the EME Manager and the Timeline Manager.

### Timeline Manager

The Timeline Manager handle the seekable range.
Useful for LIVE content.

### EME Manager

Some DRM providers requires that you add some extra data for the license handshake between the CDM and the DRM server, and this is what the EME Manager would take care of.

### Download Manager

The Download Manager goal is to keep downloading the next segments.
It instanciates one Segment Downloader for each type: video, audio, text

### Segment Downloader A/V/T

The Segment Downloader keeps the list of the available segments.
It handle the logic to download a segment.

### Buffer Manager

The Buffer Manager goal is to keep feeding the buffers.
It also responsible to call the end of the stream.
It instanciates one Buffer for each type: video, audio, text.

### Buffer A/V/T

The buffer handle the logic for pushing the audio and video data to the MSE source buffer, and if it is a text segment it passes the text data to the Text parser.
It also clear the buffer.

### Text Parser

The Text Parser choose the right parser based on the text segment.

### TTML Parser

The TTML Parser is responsible for parsing the TTML fragment.

### Period Stream

The Period stream instanciates one Adaptation Stream for each type: video, audio, text.
It also keep track of the active period.

### Adaptation Stream A/V/T

The Adaptation stream is responsible to choose the right AdaptationSet and instanciates the Representation Stream.
It also keep track of the active adaptation.

### Representation Stream A/V/T

The Adaptation stream is responsible to choose the right Representation and if it is a video representation it instanciates the ABR Manager.
It also keep track of the active representation.

## ABR Manager

The ABR Manager (Adapative Bitrate Manager) is the brain of the ABR heuristics the player application implements. It continuously estimates the available bandwidth / buffer and give suggestions to the Representation Stream on when to switch quality level.

### Config

Singleton, it keeps and update the player configuration.

### Dispatcher

Singleton, it adds/removes event listeners and it's used for emit Custom Events

### Xhr

Singleton, it handles all the xhr requests. It can retry the request few times and recover from offline status.
It also instanciates the Cdn Manager.

### CDN Manager

It keeps the list of the available CDN and handles the switch logic.
