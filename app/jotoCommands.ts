export const beginCommand = `
G21 ; Set units to Metric
G90 ; Absolute coordinates
M106 S40 ; Move Jotos pen to position 40 which lifts the nib out of the dock
G4 P500 ; Short pause to allow the pen to move
M106 S0 ; Turn the motor off that moves the pen
; This block of commands allows Joto to reliably set the home (0,0) position
G91
G1 F16000
M202 X450 Y450
G1 X5
G28 X0
G1 Y5
G28 Y0
G90
G4 P1000
M202 X250 Y250 ; Set the acceleration for your jot
G1 F8000 ; Set the speed
`;

export const endCommand = `
M106 S40 ; lifts the nib all the way up, ready to enter the dock
G4 P100
M106 S0
; This block of commands allows Joto to reliably get back to the home (0,0) position
G91
G1 F16000
M202 X450 Y450
G1 X5
G28 X0
G1 Y5
G28 Y0
G90
G4 P1000
M106 S140 ; Moves Jotos pen to position 140 to place the nib back into the dock
G4 P1000
M106 S0
M84 ; Turns Jotos motors off.
`;

export const penOnCommand = `
M106 S110.0
G4 P60.0`;

export const penOffCommand = `
M106 S70.0
G4 P60.0`;