## WORK IN PROGRESS
Goals: 
- develop better understanding of full ecosystem
- layer swappability (make composability visible, make different sources of truth optional). Ability to switch between jetstreams, switch between PDS & index as source of truth, self-hosted appview vs. pointer index, other options???
- encourage users to modify their own PDS or build separate tools for modifying app-specific data - create functionalities and UI elements that *only* appear when the data is modified from outside of the app
- *option* to not have external dependencies wherever possible (eg can use the Bluesky jetstream, but would be nice to run my own as well, same with eventual integrations with microcosm/appview/whatever)




## About


## Questions
- Who is the arbiter of truth?
- What are the weaknesses and strengths of each potential arbiter? What becomes apparent when you can switch them?
- What are the different models of ownership & control of "digital space", both historically and available even within this app? How does it differ even based on how you choose to enforce timing, e.g. competing based on "last in" like r/place or YWOT vs. "first in".
- Other digital ownership models - "buying land" in metaverse, NFTs, etc.
- Who owns the web? Who owns this text? Where does it live? What is true?
- What decisions am I still making from a BDFL/godlike perspective? What agency am I still taking from the user? (eg should they be able to edit their old texts by clicking into them, or should they be created as new ones?)
- If primary mechanic is *theft*/encouraging people to build external tools, does the text interface still make the most sense? What else could the UI be?
- Exploration of trust/permission structure (e.g. oauth scope in different views/contexts)


*FIXME* - initial draft mostly focused on finding center point of "minimum centralization, minimum effort, minimum expense" - becoming more open to tracking stuff locally as a way to show tradeoffs.

This is mostly a project I am building to explore/demonstrate some of the things I find interesting about atproto and decentralized data storage. I think the idea of credible exit/"own your own data" is really cool, and I am really curious about what that can afford us in terms of graphical or canvas-based data. If there were a lexicon for drawing software, what would it look like? How cool would it be if it were actually easy to leave Figma or whatever? But I don't want to deal with building and supporting actual canvas-based software, so I built this instead. It is a provocation that I hope will inspire atproto devs to think outside of text-based apps and pursue more creative/visual work, or inspire software artists to try building things on the protocol.

But I also wanted it to serve as a way of demonstrating some of the parts of the protocol that are not as easy to understand (or at least, were not for me). If you're reading this, you're probably enough of a nerd to understand the basics of what a PDS is and what data ownership means in this context, but you might not have dug into how interacting with the atproto network actually works in practice: if there are multiple sources of truth, how do you reconcile them? How do you run a functional application that's dependent on a bunch of independent PDS operators? And, if you're philosophically interested in your data being *meaningfully decentralized*, how do you do that in practice? What does *meaningfully decentralized* even mean?


The protocol's official way of handling this is using Jetstream and an AppView: basically you mirror all network records for your application locally, so you can treat the PDS as a source of truth without having to ping a thousand of them every time someone views your application. Jetstream listens to all online PDSes for new events, optionally filters them for only events that you're interested in, and then sends them to the AppView, which stores them for your application. That is a very short way of explaining some immensely complicated stuff: I've been following and intermittently writing about the protocol for almost a year and really only felt confident in my understanding after building this project. That usually means I'm wrong so feel free to correct me.


The AppView is a perfectly good architectural concept and serves the needs of larger applications quite well, but it feels kind of like overkill for my silly little art project, at least for now, and I wanted to make sure what I'm building made it clear to both me and the user what's stored in the app and what data they *actually own*. I may add it as a swappable layer down the line, though. At any rate, at least in this v1, the application treats three different data sources as a source of truth, and allows users to explore the strengths and weaknesses of each one:

1) The PDS
2) The Jetstream
3) A local database

In many ways, right now it functions like Your World of Text, but with a couple key differences.

1) All data is attached to a user's account - users "own" the text they write and even the worlds they create.
2) This means all the data has an "owner", making each world more like digital real estate than just a new, different canvas.
3) Because of the unique affordances of atproto, users can modify data without ever actually having to interact with the system, which creates a lot of interesting conflicts over ownership. By modifying the data directly in your PDS, you can overwrite and delete text, change behavior, and even "claim" a world someone else created without ever visiting the website.


It is my hope that by making clear in the interface and behavior of this project that there are multiple sources of truth available, and by encouraging people to compete over resources and modify data outside the interface, it will help all of us understand a little better what it means for something to be "true" or for data to "belong" to someone. 



## Technical Design
Features:

1) Sort/filter:
	- Contributions by user
	- Scroll back in time
2) Alternate views:
	- Show contributions in form of TIMESTAMP, TEXT, X,Y (click to view in canvas?)
  - First in on top instead of last in
3) Ownership: new canvases (end URL strings) belong to you. 
4) Customization: font selection, should you be able to set your own color or should it be randomly assigned by the app? "Other orders": selecting different sources of truth, different orders of "ownership" (first in vs. last in), what are other options?


## v1 stack diagram

moving parts:

data store, source of truth: user PDS
stored locally (sqlite): pointer index to world and text records (with position data so it doesn't have to ping PDS on every cold start), sessions and jetstream cursor. at-uri, derived name from at-uri, and history of ownership (each at-uri with "arrival time" from jetstream (time_us)). 
cache: ensure records are fetched once per TTL
jetstream worker: modifies local pointer index & cache based on app-related events from the network. proactive invalidation for cache: evict or refresh cache entry on change, rather then letting it live out TTL.
next.js app: servers routes, does oauth and executes read path


lexicons:

world:
rkey: name
creator: repo record lives in (eg did:plc:xyz/com.ourworldsoftext.world/sandbox), stored in at-uri
record body: createdAt (from UI)
text:
rkey: tid
position
characters
createdAt (set by record writer, so in-app writes are honest but PDS modification can say anything)
world reference (at-uri of world it points to, if world has changed owners we fall back to finding the new at-uri by extracting world string)


World creation (inside UI):
1. Alice attempts to create world "sandbox"
2. Preflight check (is "sandbox" available?).
3. If yes, write to PDS. If no, go to existing world.
4. Jetstream notifies that world has been created
5. Worker creates index row.

World takeover/ownership change:
1. new claim on existing name becomes owner (but must be made from somewhere other than the app interface)
2. if a claim is deleted, ownership falls back to the most recent claim still marked as alive in the index
3. retirement: once every claim on a name is dead, the name is retired forever. later claims are informed that this world has died.
4. graveworlds: retired names appear in list, you can click through to see the dead world (just a faded version of the regular UI)
5. possible worlds: created outside of the UI entirely, displayed differently. can have separate owner and creator (owner is DID in falsely created reference, creator is marked from jetstream). dies when last text referencing it is deleted - dead possible worlds return to the pool of unclaimed worlds rather than goin to the graaveyard.

Read path:

1. open page
2. resolve URL to world's at-uri
3. ask index which records exist for current world *name* within viewport (since at-uri may have changed)
4. ask cache if we have data for those records, if so, display
5. if records not in cache: get records from relevant PDSes and write to cache.
6. once records fetched from cache/PDS, render


Write (text) path:

- One record per "run" (reasonable time window for keystroke entry). A run ends on timeout, a change in cursor position, or Enter. Edits update the same record (eg backspace or moving cursor within that record)
- Listening window controls PDS writes - keystrokes are relayed live to other viewers, but shown as pending until they've landed back in the index.
- Last-updated is source of truth, but first-seen and createdAt are also tracked, should be toggleable in power user menu.
- Typing over your old run starts a new one on top.
- Same as above for stacking order when people write over each other's runs.

Holes/hackable stuff:
- `createdAt` is user suppliable - actually all PDS records are user suppliable, which makes the index pretty important for source of *local* truth, although I think there's something interesting there about not doing too much work to reconcile things and allowing people to modify their own records and PDSes. Yeah fuck the index let's say most recent person to claim it is the owner, while still tracking ownership history and arrivalTime in index to demonstrate the difference between centralized and decentralized data.
- Arrival time in creating a world or text depends on which jetstream instance you watch
- Recrawling could prevent us from getting an accurate arrival time, assuming an outage prevents us from listening to jetstream
- Delay between jetstream/PDS updates and index update
- What happens on full account deletion? should users expect all their contributions to be deleted if their DID is? 
- Writing directly to index on world creation - prevents race condition, but means we're not relying on the network as a source of truth. STICK WITH THIS BUT TRACK BOTH
- Back up SQLite file since claim history and arrival times can't be rebuilt (could we rebuild claim history at least just from the network? or is that too resource-intensive)



#### Side notes/old draft stuff

TK:
- alternatives to self-hosted appview - relay? bsky appview? microcosm?

not using either right now, but may want to at some point

Constellation vs. Appview -

tension is discovery - I need to store *something* locally and cache it if I don't want to do direct-PDS reads (and even that needs local storage of users who have logged in). Since constellation stores PDS pointers it always pulls from the PDS by default - not possible for my data to be out of sync with the PDS. BUT constellation stores the whole network and grows 2GB a day which I do *not* want to deal with.

Could try app-specific pointer index. It's an experiment, is still a jetstream consumer, and I can always take it down or revisit if traffic becomes a big enough problem to matter.

- old goal: make the minimum possible application that doesn't require an appview or anyone else's infrastructure - minimize info stored locally while still being polite to upstream PDS hosts.



