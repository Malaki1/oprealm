-- OPREALM Obby Builder v1
-- Install by copying this file to:
-- %LOCALAPPDATA%\Roblox\Plugins\OPREALMObbyBuilder.lua

local HttpService = game:GetService("HttpService")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local Selection = game:GetService("Selection")
local TweenService = game:GetService("TweenService")

local toolbar = plugin:CreateToolbar("OPREALM")
local button = toolbar:CreateButton("Obby Builder", "Open OPREALM Obby Builder", "")

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	true,
	false,
	440,
	700,
	340,
	540
)

local widget = plugin:CreateDockWidgetPluginGui("OPREALMObbyBuilder", widgetInfo)
widget.Title = "OPREALM Obby Builder"

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(8, 18, 47)
root.BorderSizePixel = 0
root.Parent = widget

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 12)
padding.PaddingRight = UDim.new(0, 12)
padding.PaddingBottom = UDim.new(0, 12)
padding.PaddingLeft = UDim.new(0, 12)
padding.Parent = root

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 38)
title.BackgroundTransparency = 1
title.Text = "OPREALM Obby Builder"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.Font = Enum.Font.GothamBold
title.TextSize = 22
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = root

local titleBox = Instance.new("TextBox")
titleBox.Size = UDim2.new(1, 0, 0, 42)
titleBox.Position = UDim2.fromOffset(0, 52)
titleBox.BackgroundColor3 = Color3.fromRGB(28, 42, 82)
titleBox.BorderColor3 = Color3.fromRGB(83, 112, 170)
titleBox.TextColor3 = Color3.fromRGB(255, 255, 255)
titleBox.PlaceholderColor3 = Color3.fromRGB(170, 190, 230)
titleBox.PlaceholderText = "Obby title, e.g. Lava Sky Run"
titleBox.Text = ""
titleBox.ClearTextOnFocus = false
titleBox.TextXAlignment = Enum.TextXAlignment.Left
titleBox.Font = Enum.Font.GothamBold
titleBox.TextSize = 14
titleBox.Parent = root

local box = Instance.new("TextBox")
box.Size = UDim2.new(1, 0, 0, 250)
box.Position = UDim2.fromOffset(0, 156)
box.BackgroundColor3 = Color3.fromRGB(28, 42, 82)
box.BorderColor3 = Color3.fromRGB(83, 112, 170)
box.TextColor3 = Color3.fromRGB(255, 255, 255)
box.PlaceholderColor3 = Color3.fromRGB(170, 190, 230)
box.PlaceholderText = "Paste OPREALM Plugin JSON here..."
box.Text = ""
box.ClearTextOnFocus = false
box.MultiLine = true
box.TextWrapped = false
box.TextXAlignment = Enum.TextXAlignment.Left
box.TextYAlignment = Enum.TextYAlignment.Top
box.Font = Enum.Font.Code
box.TextSize = 13
box.Parent = root

local wallpaperBox = Instance.new("TextBox")
wallpaperBox.Size = UDim2.new(1, 0, 0, 42)
wallpaperBox.Position = UDim2.fromOffset(0, 104)
wallpaperBox.BackgroundColor3 = Color3.fromRGB(28, 42, 82)
wallpaperBox.BorderColor3 = Color3.fromRGB(83, 112, 170)
wallpaperBox.TextColor3 = Color3.fromRGB(255, 255, 255)
wallpaperBox.PlaceholderColor3 = Color3.fromRGB(170, 190, 230)
wallpaperBox.PlaceholderText = "Optional wallpaper image asset ID, e.g. 1234567890"
wallpaperBox.Text = ""
wallpaperBox.ClearTextOnFocus = false
wallpaperBox.TextXAlignment = Enum.TextXAlignment.Left
wallpaperBox.Font = Enum.Font.GothamBold
wallpaperBox.TextSize = 13
wallpaperBox.Parent = root

local buildButton = Instance.new("TextButton")
buildButton.Size = UDim2.new(1, 0, 0, 48)
buildButton.Position = UDim2.fromOffset(0, 422)
buildButton.BackgroundColor3 = Color3.fromRGB(24, 217, 255)
buildButton.TextColor3 = Color3.fromRGB(7, 16, 58)
buildButton.Text = "Build Obby"
buildButton.Font = Enum.Font.GothamBold
buildButton.TextSize = 18
buildButton.Parent = root

local clearButton = Instance.new("TextButton")
clearButton.Size = UDim2.new(1, 0, 0, 42)
clearButton.Position = UDim2.fromOffset(0, 480)
clearButton.BackgroundColor3 = Color3.fromRGB(55, 70, 112)
clearButton.TextColor3 = Color3.fromRGB(255, 255, 255)
clearButton.Text = "Clear Previous OPREALM Obby"
clearButton.Font = Enum.Font.GothamBold
clearButton.TextSize = 15
clearButton.Parent = root

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, 0, 0, 82)
status.Position = UDim2.fromOffset(0, 538)
status.BackgroundTransparency = 1
status.Text = "Paste Plugin JSON from OPREALM, then click Build Obby."
status.TextColor3 = Color3.fromRGB(170, 190, 230)
status.Font = Enum.Font.Gotham
status.TextSize = 14
status.TextWrapped = true
status.TextXAlignment = Enum.TextXAlignment.Left
status.TextYAlignment = Enum.TextYAlignment.Top
status.Parent = root

local THEME_COLORS = {
	Volcano = {
		base = Color3.fromRGB(52, 44, 50),
		platform = Color3.fromRGB(70, 70, 82),
		hazard = Color3.fromRGB(255, 78, 26),
		accent = Color3.fromRGB(255, 178, 44),
	},
	Candy = {
		base = Color3.fromRGB(255, 176, 221),
		platform = Color3.fromRGB(255, 236, 150),
		hazard = Color3.fromRGB(255, 86, 124),
		accent = Color3.fromRGB(103, 221, 255),
	},
	Space = {
		base = Color3.fromRGB(18, 22, 58),
		platform = Color3.fromRGB(80, 101, 190),
		hazard = Color3.fromRGB(77, 230, 255),
		accent = Color3.fromRGB(170, 101, 255),
	},
	Cyber = {
		base = Color3.fromRGB(10, 18, 34),
		platform = Color3.fromRGB(33, 64, 96),
		hazard = Color3.fromRGB(24, 217, 255),
		accent = Color3.fromRGB(204, 64, 255),
	},
	Jungle = {
		base = Color3.fromRGB(32, 74, 44),
		platform = Color3.fromRGB(82, 112, 54),
		hazard = Color3.fromRGB(220, 76, 36),
		accent = Color3.fromRGB(76, 205, 112),
	},
	Ice = {
		base = Color3.fromRGB(28, 60, 92),
		platform = Color3.fromRGB(126, 204, 235),
		hazard = Color3.fromRGB(170, 245, 255),
		accent = Color3.fromRGB(96, 149, 255),
	},
	Pirate = {
		base = Color3.fromRGB(58, 39, 28),
		platform = Color3.fromRGB(134, 86, 45),
		hazard = Color3.fromRGB(255, 198, 62),
		accent = Color3.fromRGB(56, 198, 218),
	},
	Sky = {
		base = Color3.fromRGB(72, 104, 168),
		platform = Color3.fromRGB(172, 218, 255),
		hazard = Color3.fromRGB(255, 229, 125),
		accent = Color3.fromRGB(255, 255, 255),
	},
	Dinosaur = {
		base = Color3.fromRGB(48, 84, 48),
		platform = Color3.fromRGB(112, 134, 72),
		hazard = Color3.fromRGB(230, 116, 52),
		accent = Color3.fromRGB(255, 193, 91),
	},
	Haunted = {
		base = Color3.fromRGB(35, 29, 58),
		platform = Color3.fromRGB(82, 74, 116),
		hazard = Color3.fromRGB(160, 86, 255),
		accent = Color3.fromRGB(84, 232, 210),
	},
}

local function setStatus(message)
	status.Text = message
	print("[OPREALM]", message)
end

local function getOrCreateFolder()
	local existing = Workspace:FindFirstChild("OPREALM_Generated_Obby")
	if existing then
		existing:Destroy()
	end

	local folder = Instance.new("Folder")
	folder.Name = "OPREALM_Generated_Obby"
	folder.Parent = Workspace
	return folder
end

local function createPart(parent, name, size, position, color, material, anchored)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Position = position
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.Anchored = anchored ~= false
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

local function addLight(part, color, range, brightness)
	local light = Instance.new("PointLight")
	light.Color = color
	light.Range = range or 18
	light.Brightness = brightness or 1.6
	light.Parent = part
	return light
end

local function addParticles(part, color, rate, lifetime, speed, size)
	local emitter = Instance.new("ParticleEmitter")
	emitter.Color = ColorSequence.new(color)
	emitter.LightEmission = 0.45
	emitter.Rate = rate or 8
	emitter.Lifetime = NumberRange.new(lifetime or 2, (lifetime or 2) + 1)
	emitter.Speed = NumberRange.new(speed or 2, (speed or 2) + 2)
	emitter.Size = NumberSequence.new(size or 1.2)
	emitter.SpreadAngle = Vector2.new(35, 35)
	emitter.Parent = part
	return emitter
end

local createPillar
local createLedSign

local function revealPart(part, delayTime)
	if not part or not part:IsA("BasePart") then return end
	local originalTransparency = part.Transparency
	part.Transparency = 1
	task.delay(delayTime or 0, function()
		if not part.Parent then return end
		TweenService:Create(
			part,
			TweenInfo.new(0.45, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
			{ Transparency = originalTransparency }
		):Play()
	end)
end

local function createForgePulse(parent, name, position, color, delayTime)
	local pulse = createPart(parent, name, Vector3.new(2, 0.25, 2), position, color, Enum.Material.Neon)
	pulse.Shape = Enum.PartType.Cylinder
	pulse.Transparency = 0.2
	addLight(pulse, color, 24, 1.8)
	addParticles(pulse, color, 18, 0.7, 4, 0.8)
	task.delay(delayTime or 0, function()
		if not pulse.Parent then return end
		TweenService:Create(
			pulse,
			TweenInfo.new(1.1, Enum.EasingStyle.Quint, Enum.EasingDirection.Out),
			{ Size = Vector3.new(18, 0.25, 18), Transparency = 1 }
		):Play()
		task.delay(1.2, function()
			if pulse.Parent then pulse:Destroy() end
		end)
	end)
	return pulse
end

local function createBlueprintLine(parent, name, startPosition, endPosition, color)
	local midpoint = (startPosition + endPosition) * 0.5
	local length = (endPosition - startPosition).Magnitude
	if length <= 0.1 then return nil end

	local line = createPart(parent, name, Vector3.new(length, 0.25, 0.25), midpoint + Vector3.new(0, 2.2, 0), color, Enum.Material.Neon)
	line.Transparency = 0.35
	line.CFrame = CFrame.lookAt(line.Position, endPosition + Vector3.new(0, 2.2, 0)) * CFrame.Angles(0, math.rad(90), 0)
	return line
end

local function createRewardCoin(parent, index, position, colors)
	local coin = createPart(parent, "RewardCoin_" .. index, Vector3.new(3, 3, 0.45), position + Vector3.new(0, 5.2, 0), colors.accent, Enum.Material.Neon)
	coin.Shape = Enum.PartType.Cylinder
	coin.CFrame = CFrame.new(coin.Position) * CFrame.Angles(0, 0, math.rad(90))
	addLight(coin, colors.accent, 16, 1.4)
	addParticles(coin, colors.accent, 4, 1.2, 1.2, 0.35)
	coin:SetAttribute("OPREALM_Spinning", true)
	return coin
end

local function createZoneGate(parent, text, position, colors, yaw)
	local left = createPillar(parent, "ZoneGate_Left_" .. text, position + Vector3.new(0, 0, -8), 16, colors.accent, Enum.Material.Neon)
	local right = createPillar(parent, "ZoneGate_Right_" .. text, position + Vector3.new(0, 0, 8), 16, colors.accent, Enum.Material.Neon)
	local top = createPart(parent, "ZoneGate_Header_" .. text, Vector3.new(2, 2, 18), position + Vector3.new(0, 16, 0), colors.hazard, Enum.Material.Neon)
	left.CFrame = CFrame.new(left.Position) * CFrame.Angles(0, math.rad(yaw or 0), math.rad(90))
	right.CFrame = CFrame.new(right.Position) * CFrame.Angles(0, math.rad(yaw or 0), math.rad(90))
	top.CFrame = CFrame.new(top.Position) * CFrame.Angles(0, math.rad(yaw or 0), 0)
	createLedSign(parent, text, position + Vector3.new(0, 22, 0), yaw or 0)
	return top
end

local function sanitizeTitle(value, fallback)
	local text = tostring(value or ""):gsub("[%c\r\n\t]", " "):gsub("%s+", " "):match("^%s*(.-)%s*$") or ""
	if text == "" then text = fallback or "OPREALM OBBY" end
	if #text > 34 then
		text = text:sub(1, 34)
	end
	return text
end

local function normalizeAssetId(value)
	local text = tostring(value or "")
	local id = text:match("rbxassetid://(%d+)") or text:match("assetId=(%d+)") or text:match("library/(%d+)") or text:match("(%d+)")
	if not id or id == "" then return nil end
	return "rbxassetid://" .. id
end

local function createTitleLetter(parent, character, position, size, colors)
	local tile = createPart(parent, "TitleLetter_" .. character, Vector3.new(size, size * 1.15, 0.7), position, Color3.fromRGB(7, 14, 35), Enum.Material.SmoothPlastic)
	tile.Transparency = 0.12
	local stroke = createPart(parent, "TitleLetterGlow_" .. character, Vector3.new(size + 0.5, size * 1.15 + 0.5, 0.35), position + Vector3.new(0, 0, -0.28), colors.accent, Enum.Material.Neon)
	stroke.Transparency = 0.28

	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 52
	gui.Parent = tile

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = character
	label.TextColor3 = Color3.fromRGB(255, 255, 255)
	label.TextStrokeColor3 = colors.hazard
	label.TextStrokeTransparency = 0.18
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.Parent = gui

	addLight(tile, colors.accent, 12, 1.1)
	return tile
end

local function createStartTitleArch(parent, obbyTitle, position, colors)
	local cleanTitle = sanitizeTitle(obbyTitle, "OPREALM OBBY")
	local archFolder = Instance.new("Folder")
	archFolder.Name = "OPREALM_Start_Title_Arch"
	archFolder.Parent = parent

	local baseLeft = createPillar(archFolder, "TitleArch_LeftPillar", position + Vector3.new(0, 0, -15), 22, colors.accent, Enum.Material.Neon)
	local baseRight = createPillar(archFolder, "TitleArch_RightPillar", position + Vector3.new(0, 0, 15), 22, colors.accent, Enum.Material.Neon)
	baseLeft.CFrame = CFrame.new(baseLeft.Position) * CFrame.Angles(0, 0, math.rad(90))
	baseRight.CFrame = CFrame.new(baseRight.Position) * CFrame.Angles(0, 0, math.rad(90))

	local beam = createPart(archFolder, "TitleArch_TopBeam", Vector3.new(2, 2.2, 33), position + Vector3.new(0, 23, 0), colors.hazard, Enum.Material.Neon)
	addLight(beam, colors.hazard, 28, 1.7)
	addParticles(beam, colors.accent, 8, 1.5, 1.3, 0.6)

	local subtitle = createLedSign(archFolder, "START", position + Vector3.new(-0.35, 13, 0), 0)
	subtitle.Size = Vector3.new(1.5, 7, 20)
	subtitle.CFrame = CFrame.new(subtitle.Position) * CFrame.Angles(0, math.rad(90), 0)

	local maxLetters = math.min(#cleanTitle, 22)
	local letterSize = maxLetters > 14 and 3.1 or 3.7
	local spacing = letterSize * 0.9
	local arcWidth = math.max((maxLetters - 1) * spacing, 1)
	local startZ = -arcWidth * 0.5

	for i = 1, maxLetters do
		local char = cleanTitle:sub(i, i)
		if char ~= " " then
			local progress = maxLetters == 1 and 0.5 or (i - 1) / (maxLetters - 1)
			local z = startZ + (i - 1) * spacing
			local arcHeight = math.sin(progress * math.pi) * 5.5
			local letter = createTitleLetter(archFolder, char:upper(), position + Vector3.new(-1.4, 27 + arcHeight, z), letterSize, colors)
			letter.CFrame = CFrame.new(letter.Position) * CFrame.Angles(0, math.rad(90), 0)
		end
	end

	createForgePulse(archFolder, "TitleArchPowerUp", position + Vector3.new(0, 4, 0), colors.accent, 0.05)
	return archFolder
end

local function createWallpaperElement(parent, name, position, size, color, transparency, cornerRadius)
	local frame = Instance.new("Frame")
	frame.Name = name
	frame.Position = position
	frame.Size = size
	frame.BackgroundColor3 = color
	frame.BackgroundTransparency = transparency or 0
	frame.BorderSizePixel = 0
	frame.Parent = parent

	if cornerRadius then
		local corner = Instance.new("UICorner")
		corner.CornerRadius = cornerRadius
		corner.Parent = frame
	end

	return frame
end

local function createWallpaperLabel(parent, text, position, size, color, transparency)
	local label = Instance.new("TextLabel")
	label.Name = "PatternLabel"
	label.Position = position
	label.Size = size
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = color
	label.TextTransparency = transparency or 0
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.Parent = parent
	return label
end

local function applyUploadedWallpaperTexture(wall, face, assetUri, sideName)
	local texture = Instance.new("Texture")
	texture.Name = "OPREALM_Uploaded_Wallpaper_" .. sideName
	texture.Face = face
	texture.Texture = assetUri
	texture.StudsPerTileU = 42
	texture.StudsPerTileV = 22
	texture.Transparency = 0.03
	texture.Color3 = Color3.fromRGB(255, 255, 255)
	texture.Parent = wall
	return texture
end

local function applyThemeWallpaper(wall, face, theme, colors, sideName, wallpaperAssetUri)
	if wallpaperAssetUri then
		applyUploadedWallpaperTexture(wall, face, wallpaperAssetUri, sideName)
		return
	end

	local surface = Instance.new("SurfaceGui")
	surface.Name = "OPREALM_2D_Wallpaper_" .. sideName
	surface.Face = face
	surface.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	surface.PixelsPerStud = 22
	surface.LightInfluence = 0
	surface.Brightness = 1.25
	surface.Parent = wall

	local canvas = Instance.new("Frame")
	canvas.Name = "WallpaperCanvas"
	canvas.Size = UDim2.fromScale(1, 1)
	canvas.BackgroundColor3 = colors.base
	canvas.BackgroundTransparency = 0.18
	canvas.BorderSizePixel = 0
	canvas.Parent = surface

	local glow = createWallpaperElement(canvas, "WallpaperGlow", UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), colors.accent, 0.84)
	local gradient = Instance.new("UIGradient")
	gradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, colors.base),
		ColorSequenceKeypoint.new(0.5, colors.accent),
		ColorSequenceKeypoint.new(1, colors.hazard),
	})
	gradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.85),
		NumberSequenceKeypoint.new(0.5, 0.62),
		NumberSequenceKeypoint.new(1, 0.85),
	})
	gradient.Rotation = sideName == "Left" and 18 or -18
	gradient.Parent = glow

	if theme == "Space" then
		for i = 1, 64 do
			local x = ((i * 37) % 100) / 100
			local y = ((i * 61) % 100) / 100
			local size = 0.006 + ((i % 4) * 0.003)
			createWallpaperElement(canvas, "Star_" .. i, UDim2.fromScale(x, y), UDim2.fromScale(size, size), Color3.fromRGB(230, 250, 255), 0.05, UDim.new(1, 0))
		end
		for i = 1, 8 do
			local x = ((i * 19) % 95) / 100
			local y = 0.14 + ((i * 23) % 72) / 100
			local nebula = createWallpaperElement(canvas, "NebulaCloud_" .. i, UDim2.fromScale(x, y), UDim2.fromScale(0.12, 0.16), i % 2 == 0 and colors.accent or colors.hazard, 0.62, UDim.new(1, 0))
			local nebulaGradient = Instance.new("UIGradient")
			nebulaGradient.Rotation = i * 24
			nebulaGradient.Parent = nebula
		end
		createWallpaperLabel(canvas, "GALAXY RUN", UDim2.fromScale(0.06, 0.08), UDim2.fromScale(0.24, 0.12), colors.accent, 0.18)
	elseif theme == "Candy" then
		for i = 1, 22 do
			local x = ((i * 11) % 96) / 100
			local y = 0.08 + ((i * 17) % 78) / 100
			createWallpaperElement(canvas, "CandyTrunk_" .. i, UDim2.fromScale(x, y + 0.08), UDim2.fromScale(0.012, 0.13), Color3.fromRGB(255, 255, 255), 0.18, UDim.new(1, 0))
			createWallpaperElement(canvas, "CandyTop_" .. i, UDim2.fromScale(x - 0.018, y), UDim2.fromScale(0.048, 0.07), i % 2 == 0 and colors.hazard or colors.accent, 0.08, UDim.new(1, 0))
			createWallpaperElement(canvas, "CandyStripe_" .. i, UDim2.fromScale(x - 0.008, y + 0.017), UDim2.fromScale(0.04, 0.012), Color3.fromRGB(255, 246, 180), 0.12, UDim.new(1, 0))
		end
		for i = 1, 14 do
			createWallpaperElement(canvas, "SugarDot_" .. i, UDim2.fromScale(((i * 29) % 95) / 100, ((i * 41) % 88) / 100), UDim2.fromScale(0.018, 0.026), Color3.fromRGB(255, 245, 255), 0.2, UDim.new(1, 0))
		end
		createWallpaperLabel(canvas, "CANDYLAND", UDim2.fromScale(0.08, 0.08), UDim2.fromScale(0.26, 0.12), Color3.fromRGB(255, 255, 255), 0.16)
	elseif theme == "Jungle" then
		for i = 1, 18 do
			local x = ((i * 13) % 96) / 100
			createWallpaperElement(canvas, "Vine_" .. i, UDim2.fromScale(x, 0), UDim2.fromScale(0.012, 1), colors.accent, 0.18, UDim.new(1, 0))
			for leaf = 1, 4 do
				local y = ((leaf * 19 + i * 7) % 92) / 100
				local leafShape = createWallpaperElement(canvas, "Leaf_" .. i .. "_" .. leaf, UDim2.fromScale(x + (leaf % 2 == 0 and 0.014 or -0.024), y), UDim2.fromScale(0.045, 0.055), Color3.fromRGB(88, 222, 111), 0.12, UDim.new(1, 0))
				local leafGradient = Instance.new("UIGradient")
				leafGradient.Rotation = leaf % 2 == 0 and 35 or -35
				leafGradient.Parent = leafShape
			end
		end
		createWallpaperLabel(canvas, "JUNGLE PATH", UDim2.fromScale(0.07, 0.08), UDim2.fromScale(0.28, 0.12), colors.accent, 0.18)
	elseif theme == "Cyber" then
		for i = 1, 16 do
			local x = i / 16
			createWallpaperElement(canvas, "GridV_" .. i, UDim2.fromScale(x, 0), UDim2.fromScale(0.004, 1), colors.hazard, 0.42)
		end
		for i = 1, 8 do
			local y = i / 8
			createWallpaperElement(canvas, "GridH_" .. i, UDim2.fromScale(0, y), UDim2.fromScale(1, 0.006), colors.accent, 0.44)
		end
		for i = 1, 18 do
			createWallpaperElement(canvas, "CircuitNode_" .. i, UDim2.fromScale(((i * 23) % 95) / 100, ((i * 31) % 86) / 100), UDim2.fromScale(0.036, 0.05), i % 2 == 0 and colors.hazard or colors.accent, 0.18, UDim.new(0, 4))
		end
		createWallpaperLabel(canvas, "NEON GRID", UDim2.fromScale(0.08, 0.08), UDim2.fromScale(0.24, 0.12), colors.hazard, 0.16)
	else
		for i = 1, 22 do
			local x = ((i * 17) % 98) / 100
			local y = 0.08 + ((i * 29) % 82) / 100
			local crack = createWallpaperElement(canvas, "MagmaCrack_" .. i, UDim2.fromScale(x, y), UDim2.fromScale(0.012, 0.18), colors.hazard, 0.12, UDim.new(1, 0))
			local rotation = Instance.new("UIGradient")
			rotation.Rotation = i % 2 == 0 and 35 or -35
			rotation.Parent = crack
			createWallpaperElement(canvas, "Ember_" .. i, UDim2.fromScale(((i * 43) % 96) / 100, ((i * 53) % 86) / 100), UDim2.fromScale(0.02, 0.03), colors.accent, 0.16, UDim.new(1, 0))
		end
		createWallpaperLabel(canvas, "MAGMA RUN", UDim2.fromScale(0.08, 0.08), UDim2.fromScale(0.24, 0.12), colors.accent, 0.14)
	end
end

local function applyThemeWallpapers(leftWall, rightWall, theme, colors, wallpaperAssetUri)
	applyThemeWallpaper(leftWall, Enum.NormalId.Back, theme, colors, "Left", wallpaperAssetUri)
	applyThemeWallpaper(rightWall, Enum.NormalId.Front, theme, colors, "Right", wallpaperAssetUri)
end

local function createPortal(parent, position, colors)
	local base = createPart(parent, "OPREALM_FinalPortal_Base", Vector3.new(22, 1.5, 22), position, colors.base, Enum.Material.Slate)
	local ringOuter = createPart(parent, "OPREALM_FinalPortal_Ring", Vector3.new(18, 18, 1.2), position + Vector3.new(0, 14, -8), colors.accent, Enum.Material.Neon)
	ringOuter.Shape = Enum.PartType.Cylinder
	ringOuter.CFrame = CFrame.new(ringOuter.Position) * CFrame.Angles(math.rad(90), 0, 0)
	ringOuter:SetAttribute("OPREALM_Spinning", true)
	addLight(ringOuter, colors.accent, 34, 2.2)
	addParticles(ringOuter, colors.accent, 18, 1.4, 2.5, 0.75)

	local core = createPart(parent, "OPREALM_FinalPortal_Core", Vector3.new(12, 12, 0.6), position + Vector3.new(0, 14, -8), colors.hazard, Enum.Material.Neon)
	core.Shape = Enum.PartType.Cylinder
	core.CFrame = ringOuter.CFrame
	core.Transparency = 0.25
	addLight(core, colors.hazard, 26, 1.6)
	return base
end

local function createCinematicFlythrough(sectionCount, finishPosition)
	local camera = Workspace.CurrentCamera
	if not camera then return end

	local targetX = sectionCount * 38
	local shots = {
		CFrame.new(Vector3.new(-18, 38, 80), Vector3.new(12, 6, 0)),
		CFrame.new(Vector3.new(targetX * 0.35, 58, 92), Vector3.new(targetX * 0.35, 7, 0)),
		CFrame.new(Vector3.new(targetX * 0.72, 48, -88), Vector3.new(targetX * 0.72, 7, 0)),
		CFrame.new(finishPosition + Vector3.new(30, 32, 58), finishPosition + Vector3.new(0, 8, 0)),
	}

	camera.CameraType = Enum.CameraType.Scriptable
	camera.CFrame = shots[1]
	task.spawn(function()
		for index = 2, #shots do
			local tween = TweenService:Create(camera, TweenInfo.new(1.15, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), { CFrame = shots[index] })
			tween:Play()
			tween.Completed:Wait()
		end
		task.wait(0.4)
		camera.CameraType = Enum.CameraType.Custom
	end)
end

local function announceBuildPhase(message, delayTime)
	setStatus(message)
	if delayTime and delayTime > 0 then
		task.wait(delayTime)
	end
end

function createPillar(parent, name, position, height, color, material)
	local pillar = createPart(parent, name, Vector3.new(2.4, height, 2.4), position + Vector3.new(0, height * 0.5, 0), color, material or Enum.Material.SmoothPlastic)
	pillar.Shape = Enum.PartType.Cylinder
	return pillar
end

local function addRuntimeScript(parent)
	local runtime = Instance.new("Script")
	runtime.Name = "OPREALM_Runtime"
	runtime.Source = [[
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local folder = script.Parent
local playerCheckpoints = {}

local function ensureStats(player)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		leaderstats = Instance.new("Folder")
		leaderstats.Name = "leaderstats"
		leaderstats.Parent = player
	end

	local checkpoint = leaderstats:FindFirstChild("Checkpoint")
	if not checkpoint then
		checkpoint = Instance.new("IntValue")
		checkpoint.Name = "Checkpoint"
		checkpoint.Value = 0
		checkpoint.Parent = leaderstats
	end

	local deaths = leaderstats:FindFirstChild("Deaths")
	if not deaths then
		deaths = Instance.new("IntValue")
		deaths.Name = "Deaths"
		deaths.Value = 0
		deaths.Parent = leaderstats
	end

	return checkpoint, deaths
end

local function ensureHud(player)
	local checkpoint, deaths = ensureStats(player)
	local gui = player:WaitForChild("PlayerGui", 10)
	if not gui then return end

	local existing = gui:FindFirstChild("OPREALMStatsGui")
	if existing then existing:Destroy() end

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "OPREALMStatsGui"
	screenGui.ResetOnSpawn = false
	screenGui.Parent = gui

	local panel = Instance.new("Frame")
	panel.Name = "StatsPanel"
	panel.Position = UDim2.new(0, 18, 0, 86)
	panel.Size = UDim2.new(0, 250, 0, 82)
	panel.BackgroundColor3 = Color3.fromRGB(7, 14, 35)
	panel.BackgroundTransparency = 0.12
	panel.BorderSizePixel = 0
	panel.Parent = screenGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 14)
	corner.Parent = panel

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(24, 217, 255)
	stroke.Thickness = 2
	stroke.Transparency = 0.2
	stroke.Parent = panel

	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Position = UDim2.new(0, 14, 0, 8)
	title.Size = UDim2.new(1, -28, 0, 22)
	title.Text = "OPREALM RUN"
	title.TextColor3 = Color3.fromRGB(140, 245, 255)
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Font = Enum.Font.GothamBlack
	title.TextScaled = true
	title.Parent = panel

	local statsText = Instance.new("TextLabel")
	statsText.BackgroundTransparency = 1
	statsText.Position = UDim2.new(0, 14, 0, 38)
	statsText.Size = UDim2.new(1, -28, 0, 34)
	statsText.TextColor3 = Color3.fromRGB(255, 255, 255)
	statsText.TextXAlignment = Enum.TextXAlignment.Left
	statsText.Font = Enum.Font.GothamBold
	statsText.TextScaled = true
	statsText.Parent = panel

	local function update()
		statsText.Text = "Checkpoint: " .. checkpoint.Value .. "    Deaths: " .. deaths.Value
	end
	checkpoint.Changed:Connect(update)
	deaths.Changed:Connect(update)
	update()
end

local function humanoidFromHit(hit)
	local character = hit and hit.Parent
	if not character then return nil end
	return character:FindFirstChildOfClass("Humanoid")
end

local function rootFromHumanoid(humanoid)
	return humanoid and humanoid.Parent and humanoid.Parent:FindFirstChild("HumanoidRootPart")
end

local function killPlayer(hit)
	local humanoid = humanoidFromHit(hit)
	if humanoid then
		humanoid.Health = 0
	end
end

for _, item in ipairs(folder:GetChildren()) do
	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Kill") then
		item.Touched:Connect(killPlayer)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Checkpoint") then
		item.Touched:Connect(function(hit)
			local humanoid = humanoidFromHit(hit)
			local root = rootFromHumanoid(humanoid)
			if humanoid and root then
				local player = Players:GetPlayerFromCharacter(humanoid.Parent)
				if player then
					local checkpointValue = item:GetAttribute("OPREALM_Checkpoint") or 0
					local checkpointStat = ensureStats(player)
					if checkpointValue >= checkpointStat.Value then
						checkpointStat.Value = checkpointValue
						playerCheckpoints[player.UserId] = item.CFrame + Vector3.new(0, 6, 0)
					end
				end
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_SpeedBoost") then
		item.Touched:Connect(function(hit)
			local humanoid = humanoidFromHit(hit)
			if humanoid then
				humanoid.WalkSpeed = 34
				task.delay(3, function()
					if humanoid then humanoid.WalkSpeed = 16 end
				end)
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Disappearing") then
		task.spawn(function()
			while item.Parent do
				item.Transparency = 0
				item.CanCollide = true
				task.wait(1.4)
				item.Transparency = 0.75
				item.CanCollide = false
				task.wait(1.0)
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Moving") then
		task.spawn(function()
			local start = item.CFrame
			local distance = item:GetAttribute("OPREALM_MoveDistance") or 18
			local goal = start * CFrame.new(0, 0, distance)
			local info = TweenInfo.new(2.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)
			TweenService:Create(item, info, { CFrame = goal }):Play()
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Spinning") then
		task.spawn(function()
			while item.Parent do
				item.CFrame = item.CFrame * CFrame.Angles(0, math.rad(5), 0)
				task.wait()
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Conveyor") then
		item.Touched:Connect(function(hit)
			local root = rootFromHumanoid(humanoidFromHit(hit))
			if root then
				root.AssemblyLinearVelocity = Vector3.new(34, root.AssemblyLinearVelocity.Y, 0)
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_FlyingHazard") then
		task.spawn(function()
			local start = item.CFrame
			local travel = item:GetAttribute("OPREALM_FlyDistance") or 58
			while item.Parent do
				item.CFrame = start
				local goal = start * CFrame.new(-travel, -16, 0)
				local tween = TweenService:Create(item, TweenInfo.new(2.4, Enum.EasingStyle.Linear), { CFrame = goal })
				tween:Play()
				tween.Completed:Wait()
				task.wait(0.8)
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_LED_SIGN") then
		task.spawn(function()
			local gui = item:FindFirstChildWhichIsA("SurfaceGui")
			local label = gui and gui:FindFirstChildWhichIsA("TextLabel")
			local colors = {
				Color3.fromRGB(24, 217, 255),
				Color3.fromRGB(126, 66, 255),
				Color3.fromRGB(255, 77, 196),
				Color3.fromRGB(49, 214, 139),
			}
			local i = 1
			while item.Parent do
				item.Color = colors[i]
				if label then label.TextColor3 = colors[i] end
				i = (i % #colors) + 1
				task.wait(0.28)
			end
		end)
	end
end

local function wirePlayer(player)
	ensureStats(player)
	task.spawn(function()
		ensureHud(player)
	end)

	player.CharacterAdded:Connect(function(character)
		task.spawn(function()
			ensureHud(player)
		end)
		local root = character:WaitForChild("HumanoidRootPart", 8)
		if root and playerCheckpoints[player.UserId] then
			task.wait(0.15)
			root.CFrame = playerCheckpoints[player.UserId]
		end

		local humanoid = character:WaitForChild("Humanoid", 8)
		if not humanoid then return end
		humanoid.Died:Connect(function()
			local _, deaths = ensureStats(player)
			deaths.Value += 1
		end)
	end)
end

for _, player in ipairs(Players:GetPlayers()) do
	wirePlayer(player)
end

Players.PlayerAdded:Connect(wirePlayer)
]]
	runtime.Parent = parent
	return runtime
end

local function makeKillZone(part)
	part:SetAttribute("OPREALM_Kill", true)
	part.CanCollide = false
	return part
end

local function createLabel(parent, text, position)
	local sign = createPart(parent, "Label_" .. text, Vector3.new(12, 5, 1), position, Color3.fromRGB(8, 18, 47), Enum.Material.SmoothPlastic)
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.Parent = sign

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = Color3.fromRGB(255, 255, 255)
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.Parent = gui
	return sign
end

function createLedSign(parent, text, position, yaw)
	local sign = createPart(parent, "LED_" .. text:gsub("%s+", "_"), Vector3.new(34, 12, 1.5), position, Color3.fromRGB(24, 217, 255), Enum.Material.Neon)
	sign.CFrame = CFrame.new(position) * CFrame.Angles(0, math.rad(yaw or 0), 0)
	sign:SetAttribute("OPREALM_LED_SIGN", true)

	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 34
	gui.Parent = sign

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = Color3.fromRGB(255, 255, 255)
	label.TextStrokeColor3 = Color3.fromRGB(7, 14, 35)
	label.TextStrokeTransparency = 0
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.Parent = gui
	return sign
end

local function createCheckpoint(parent, index, position)
	local pad = createPart(parent, "Checkpoint_" .. index, Vector3.new(10, 1, 10), position, Color3.fromRGB(49, 214, 139), Enum.Material.Neon)
	pad:SetAttribute("OPREALM_Checkpoint", index)
	createLabel(parent, "Checkpoint " .. index, position + Vector3.new(0, 6, -6))
	return pad
end

local function horizontalHalfExtent(size, direction)
	local flat = Vector3.new(direction.X, 0, direction.Z)
	if flat.Magnitude <= 0 then return size.X * 0.5 end
	local unit = flat.Unit
	return math.abs(unit.X) * size.X * 0.5 + math.abs(unit.Z) * size.Z * 0.5
end

local function edgeGapBetween(aPosition, aSize, bPosition, bSize)
	local delta = Vector3.new(bPosition.X - aPosition.X, 0, bPosition.Z - aPosition.Z)
	local distance = delta.Magnitude
	if distance <= 0 then return 0 end
	local reverse = Vector3.new(-delta.X, 0, -delta.Z)
	return distance - horizontalHalfExtent(aSize, delta) - horizontalHalfExtent(bSize, reverse)
end

local function maxSafeJumpGap(difficulty)
	if difficulty == "Hard" then return 6.0 end
	if difficulty == "Medium" then return 5.0 end
	return 3.8
end

local function nextPlatformPosition(previousPosition, previousSize, nextSize, desiredEdgeGap, laneZ, difficulty)
	local targetZ = laneZ or previousPosition.Z
	local dx = previousSize.X * 0.5 + nextSize.X * 0.5 + desiredEdgeGap
	local candidate = Vector3.new(previousPosition.X + dx, previousPosition.Y, targetZ)
	local measuredGap = edgeGapBetween(previousPosition, previousSize, candidate, nextSize)
	local safety = maxSafeJumpGap(difficulty)

	while measuredGap > safety and math.abs(targetZ - previousPosition.Z) > 0.25 do
		targetZ = previousPosition.Z + (targetZ - previousPosition.Z) * 0.82
		candidate = Vector3.new(previousPosition.X + dx, previousPosition.Y, targetZ)
		measuredGap = edgeGapBetween(previousPosition, previousSize, candidate, nextSize)
	end

	while measuredGap > safety do
		dx -= 0.5
		candidate = Vector3.new(previousPosition.X + dx, previousPosition.Y, targetZ)
		measuredGap = edgeGapBetween(previousPosition, previousSize, candidate, nextSize)
	end

	return candidate
end

local function applyThemeEnvironment(theme)
	if theme == "Space" then
		Lighting.ClockTime = 0
		Lighting.Brightness = 1.5
		Lighting.Ambient = Color3.fromRGB(60, 72, 130)
		Lighting.OutdoorAmbient = Color3.fromRGB(20, 24, 64)
	elseif theme == "Candy" then
		Lighting.ClockTime = 13
		Lighting.Brightness = 2.4
		Lighting.Ambient = Color3.fromRGB(255, 186, 229)
		Lighting.OutdoorAmbient = Color3.fromRGB(255, 220, 246)
	elseif theme == "Cyber" then
		Lighting.ClockTime = 21
		Lighting.Brightness = 1.8
		Lighting.Ambient = Color3.fromRGB(38, 72, 106)
		Lighting.OutdoorAmbient = Color3.fromRGB(8, 18, 47)
	elseif theme == "Jungle" then
		Lighting.ClockTime = 16
		Lighting.Brightness = 2
		Lighting.Ambient = Color3.fromRGB(80, 122, 72)
		Lighting.OutdoorAmbient = Color3.fromRGB(42, 84, 54)
	elseif theme == "Ice" or theme == "Sky" then
		Lighting.ClockTime = 11
		Lighting.Brightness = 2.3
		Lighting.Ambient = Color3.fromRGB(140, 190, 255)
		Lighting.OutdoorAmbient = Color3.fromRGB(184, 226, 255)
	elseif theme == "Pirate" or theme == "Dinosaur" then
		Lighting.ClockTime = 15
		Lighting.Brightness = 2.1
		Lighting.Ambient = Color3.fromRGB(96, 126, 74)
		Lighting.OutdoorAmbient = Color3.fromRGB(64, 94, 62)
	elseif theme == "Haunted" then
		Lighting.ClockTime = 23
		Lighting.Brightness = 1.45
		Lighting.Ambient = Color3.fromRGB(74, 58, 118)
		Lighting.OutdoorAmbient = Color3.fromRGB(28, 24, 55)
	else
		Lighting.ClockTime = 18
		Lighting.Brightness = 1.7
		Lighting.Ambient = Color3.fromRGB(120, 72, 48)
		Lighting.OutdoorAmbient = Color3.fromRGB(72, 44, 44)
	end
end

local function createThemeVista(parent, theme, sectionCount, colors)
	local length = sectionCount * 72 + 120
	local centerX = sectionCount * 36

	if theme == "Space" then
		for i = 1, sectionCount + 2 do
			local x = (i - 1) * 54 + 18
			local planet = createPart(parent, "DistantPlanet_" .. i, Vector3.new(10 + (i % 3) * 4, 10 + (i % 3) * 4, 10 + (i % 3) * 4), Vector3.new(x, 46 + (i % 2) * 10, (i % 2 == 0) and -52 or 52), colors.accent, Enum.Material.Neon)
			planet.Shape = Enum.PartType.Ball
			planet.Transparency = 0.18
			addLight(planet, colors.accent, 26, 1.4)
		end
		for i = 1, 18 do
			local star = createPart(parent, "NeonStar_" .. i, Vector3.new(1.2, 1.2, 1.2), Vector3.new(i * 22, 36 + (i % 5) * 5, (i % 2 == 0) and -41 or 41), Color3.fromRGB(220, 245, 255), Enum.Material.Neon)
			star.Shape = Enum.PartType.Ball
		end
	elseif theme == "Candy" then
		for i = 1, sectionCount + 3 do
			local side = (i % 2 == 0) and -1 or 1
			local mound = createPart(parent, "GumdropHill_" .. i, Vector3.new(16, 9, 16), Vector3.new(i * 42, 3, side * 50), colors.base, Enum.Material.SmoothPlastic)
			mound.Shape = Enum.PartType.Ball
			mound.Transparency = 0.08
			local swirl = createPart(parent, "CandySwirl_" .. i, Vector3.new(10, 1, 10), mound.Position + Vector3.new(0, 7, 0), colors.accent, Enum.Material.Neon)
			swirl.Shape = Enum.PartType.Cylinder
		end
	elseif theme == "Cyber" then
		for i = 1, sectionCount + 3 do
			local side = (i % 2 == 0) and -1 or 1
			local tower = createPart(parent, "CyberSkylineTower_" .. i, Vector3.new(8, 24 + (i % 4) * 7, 8), Vector3.new(i * 40, 10, side * 48), colors.platform, Enum.Material.Metal)
			createPart(parent, "CyberLightStrip_" .. i, Vector3.new(8.5, 1, 8.5), tower.Position + Vector3.new(0, tower.Size.Y * 0.35, 0), colors.hazard, Enum.Material.Neon)
			addLight(tower, colors.hazard, 22, 1.2)
		end
	elseif theme == "Jungle" then
		for i = 1, sectionCount + 4 do
			local side = (i % 2 == 0) and -1 or 1
			local trunk = createPillar(parent, "PalmTrunk_" .. i, Vector3.new(i * 34, 0, side * 48), 20 + (i % 3) * 4, Color3.fromRGB(92, 64, 38), Enum.Material.Wood)
			local canopy = createPart(parent, "PalmCanopy_" .. i, Vector3.new(15, 9, 15), trunk.Position + Vector3.new(0, trunk.Size.Y * 0.55, 0), colors.accent, Enum.Material.Grass)
			canopy.Shape = Enum.PartType.Ball
		end
	else
		for i = 1, sectionCount + 3 do
			local side = (i % 2 == 0) and -1 or 1
			local volcano = createPart(parent, "BasaltCone_" .. i, Vector3.new(14, 18 + (i % 3) * 4, 14), Vector3.new(i * 44, 7, side * 50), colors.base, Enum.Material.Slate)
			local lavaGlow = createPart(parent, "MagmaCrack_" .. i, Vector3.new(9, 0.8, 9), volcano.Position + Vector3.new(0, volcano.Size.Y * 0.45, 0), colors.hazard, Enum.Material.Neon)
			lavaGlow.Shape = Enum.PartType.Cylinder
			addParticles(lavaGlow, Color3.fromRGB(80, 80, 80), 5, 2.5, 1.5, 2)
		end
	end

	createPart(parent, "DistantHorizonGlow", Vector3.new(length, 1.5, 3), Vector3.new(centerX, 1.2, -54), colors.accent, Enum.Material.Neon).Transparency = 0.35
	createPart(parent, "DistantHorizonGlow_Right", Vector3.new(length, 1.5, 3), Vector3.new(centerX, 1.2, 54), colors.accent, Enum.Material.Neon).Transparency = 0.35
end

local function createHazard(parent, obstacle, position, theme)
	local colors = THEME_COLORS[theme] or THEME_COLORS.Volcano
	if obstacle == "Spinning hammers" then
		local arm = createPart(parent, "SpinningHammerArm", Vector3.new(26, 1.2, 1.2), position + Vector3.new(0, 5, 0), colors.hazard, Enum.Material.Neon)
		arm:SetAttribute("OPREALM_Spinning", true)
		arm:SetAttribute("OPREALM_Kill", true)
		createPart(parent, "SpinningHammerPivot", Vector3.new(2, 6, 2), position + Vector3.new(0, 3, 0), colors.accent, Enum.Material.Neon)
		return arm
	end

	if obstacle == "Speed boosts" then
		local boost = createPart(parent, "SpeedBoost", Vector3.new(12, 0.6, 8), position + Vector3.new(0, 0.8, 0), colors.accent, Enum.Material.Neon)
		boost:SetAttribute("OPREALM_SpeedBoost", true)
		return boost
	end

	if obstacle == "Conveyor belts" then
		local belt = createPart(parent, "ConveyorBelt", Vector3.new(18, 1, 10), position, Color3.fromRGB(35, 38, 50), Enum.Material.Metal)
		belt:SetAttribute("OPREALM_Conveyor", true)
		createPart(parent, "ConveyorArrow", Vector3.new(6, 0.4, 2), position + Vector3.new(0, 1, -1), colors.accent, Enum.Material.Neon)
		return belt
	end

	if obstacle == "Disappearing platforms" then
		local ghost = createPart(parent, "DisappearingPlatform", Vector3.new(14, 1, 10), position, colors.platform, Enum.Material.Glass)
		ghost.Transparency = 0.24
		ghost:SetAttribute("OPREALM_Disappearing", true)
		return ghost
	end

	return makeKillZone(createPart(parent, "LavaJumpKillZone_" .. obstacle, Vector3.new(24, 0.8, 16), position + Vector3.new(0, -1.4, 0), colors.hazard, Enum.Material.Neon))
end

local function addThemeDecor(parent, theme, position, index)
	local colors = THEME_COLORS[theme] or THEME_COLORS.Volcano
	if theme == "Candy" then
		createPart(parent, "LollipopStick_" .. index, Vector3.new(1, 16, 1), position + Vector3.new(-14, 8, -18), Color3.fromRGB(255, 255, 255), Enum.Material.SmoothPlastic)
		local ball = createPart(parent, "LollipopTop_" .. index, Vector3.new(8, 8, 2), position + Vector3.new(-14, 18, -18), colors.hazard, Enum.Material.Neon)
		ball.Shape = Enum.PartType.Ball
		addLight(ball, colors.hazard, 18, 1)
	elseif theme == "Space" then
		local asteroid = makeKillZone(createPart(parent, "FlyingMeteor_" .. index, Vector3.new(7, 7, 7), position + Vector3.new(28, 22, -10), Color3.fromRGB(90, 92, 108), Enum.Material.Slate))
		asteroid.Shape = Enum.PartType.Ball
		asteroid:SetAttribute("OPREALM_FlyingHazard", true)
		asteroid:SetAttribute("OPREALM_FlyDistance", 68)
		addParticles(asteroid, colors.hazard, 12, 0.9, 4, 1.5)
	elseif theme == "Jungle" then
		createPart(parent, "Vine_" .. index, Vector3.new(1, 18, 1), position + Vector3.new(-15, 9, -18), colors.accent, Enum.Material.Grass)
		createPart(parent, "TempleStone_" .. index, Vector3.new(10, 7, 4), position + Vector3.new(-22, 3.5, 22), colors.base, Enum.Material.Slate)
	elseif theme == "Cyber" then
		local pillar = createPart(parent, "NeonPillar_" .. index, Vector3.new(2, 18, 2), position + Vector3.new(-16, 9, -20), colors.hazard, Enum.Material.Neon)
		addLight(pillar, colors.hazard, 20, 1.5)
		createPart(parent, "CircuitLine_" .. index, Vector3.new(22, 0.4, 0.4), position + Vector3.new(0, 2, -25), colors.hazard, Enum.Material.Neon)
	else
		local rock = createPart(parent, "VolcanoRock_" .. index, Vector3.new(7, 7, 7), position + Vector3.new(-16, 3.5, -18), colors.base, Enum.Material.Slate)
		rock.Shape = Enum.PartType.Ball
		local vent = createPart(parent, "SmokeVent_" .. index, Vector3.new(5, 1, 5), position + Vector3.new(18, 1, 20), colors.hazard, Enum.Material.Neon)
		vent.Shape = Enum.PartType.Cylinder
		addParticles(vent, Color3.fromRGB(80, 80, 80), 10, 2.2, 2.5, 2)
	end
end

local function decodePayload()
	local text = box.Text
	if text == nil or text:gsub("%s+", "") == "" then
		error("Paste OPREALM Plugin JSON first.")
	end

	local ok, payload = pcall(function()
		return HttpService:JSONDecode(text)
	end)

	if not ok or typeof(payload) ~= "table" then
		error("That is not valid JSON. Copy the Plugin JSON box from OPREALM again.")
	end

	if payload.command ~= "BuildObbyFromSpec" then
		error("This JSON is not an OPREALM obby build payload.")
	end

	return payload
end

local function buildObby(payload)
	local plan = payload.plan or {}
	local theme = plan.theme or "Volcano"
	local difficulty = plan.difficulty or "Easy"
	local obbyTitle = sanitizeTitle(titleBox.Text ~= "" and titleBox.Text or plan.title or payload.title, theme .. " Obby")
	local wallpaperAssetUri = normalizeAssetId(wallpaperBox.Text ~= "" and wallpaperBox.Text or plan.wallpaperAssetId or payload.wallpaperAssetId)
	local colors = THEME_COLORS[theme] or THEME_COLORS.Volcano
	local sectionCount = tonumber(plan.sectionCount) or 4
	local obstacles = plan.obstacles or { "Moving platforms", "Lava jumps", "Disappearing platforms" }
	local zoneNamesByTheme = {
		Volcano = { "START RUINS", "MAGMA BRIDGE", "ASH TOWER", "LAVA FINALE" },
		Candy = { "SUGAR START", "GUMMY PATH", "FROSTING RUN", "SWEET PORTAL" },
		Space = { "LAUNCH BAY", "ASTEROID FIELD", "STAR BRIDGE", "GALAXY GATE" },
		Cyber = { "GRID START", "NEON LANES", "DATA TOWER", "PORTAL CORE" },
		Jungle = { "TEMPLE START", "VINE BRIDGE", "CANOPY RUN", "RELIC GATE" },
		Ice = { "FROST START", "CRYSTAL PATH", "GLACIER RUN", "AURORA GATE" },
		Pirate = { "DOCK START", "TREASURE BRIDGE", "SHIPWRECK RUN", "GOLDEN GATE" },
		Sky = { "CLOUD START", "SKY BRIDGE", "PALACE RUN", "STAR GATE" },
		Dinosaur = { "FOSSIL START", "JUNGLE BRIDGE", "RAPTOR RUN", "AMBER GATE" },
		Haunted = { "MOON START", "COBWEB PATH", "MANSION RUN", "GHOST GATE" },
	}
	local zoneNames = zoneNamesByTheme[theme] or zoneNamesByTheme.Volcano

	local folder = getOrCreateFolder()
	announceBuildPhase("AI Forge online. Reading OPRealm obby blueprint...", 0.35)
	applyThemeEnvironment(theme)
	announceBuildPhase("Balancing jump gaps for " .. difficulty .. " players...", 0.35)

	addRuntimeScript(folder)
	announceBuildPhase("Raising biome foundation and cinematic backdrop...", 0.35)
	local underplate = createPart(folder, "ObsidianUnderplate", Vector3.new(sectionCount * 72 + 90, 2, 70), Vector3.new(sectionCount * 36, -5, 0), colors.base, Enum.Material.Slate)
	revealPart(underplate, 0)
	local lava = makeKillZone(createPart(folder, "FloorIsLava_KillZone", Vector3.new(sectionCount * 72 + 120, 1, 78), Vector3.new(sectionCount * 36, 0.5, 0), colors.hazard, Enum.Material.Neon))
	lava.Transparency = 0.08
	local leftBackdrop = createPart(folder, "ThemeBackdrop_Left", Vector3.new(sectionCount * 72 + 80, 24, 2), Vector3.new(sectionCount * 36, 10, -40), colors.base, Enum.Material.SmoothPlastic)
	leftBackdrop.Transparency = 0.25
	local rightBackdrop = createPart(folder, "ThemeBackdrop_Right", Vector3.new(sectionCount * 72 + 80, 24, 2), Vector3.new(sectionCount * 36, 10, 40), colors.base, Enum.Material.SmoothPlastic)
	rightBackdrop.Transparency = 0.25
	applyThemeWallpapers(leftBackdrop, rightBackdrop, theme, colors, wallpaperAssetUri)
	createThemeVista(folder, theme, sectionCount, colors)
	createLedSign(folder, "OPREALM\nANIMATION", Vector3.new(36, 20, -41), 0)
	createLedSign(folder, "OPREALM\nANIMATION", Vector3.new(math.max(82, sectionCount * 72 - 10), 20, 41), 180)
	local spawnPad = createPart(folder, "SpawnPad", Vector3.new(18, 1.5, 18), Vector3.new(0, 4, 0), Color3.fromRGB(24, 217, 255), Enum.Material.Neon)
	revealPart(spawnPad, 0.15)
	createForgePulse(folder, "SpawnForgePulse", spawnPad.Position + Vector3.new(0, 1.4, 0), Color3.fromRGB(24, 217, 255), 0.15)
	createLabel(folder, "OPREALM " .. obbyTitle, Vector3.new(0, 14, -12))

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "OPREALM_Spawn"
	spawn.Size = Vector3.new(10, 1, 10)
	spawn.Position = Vector3.new(0, 5, 0)
	spawn.Anchored = true
	spawn.Color = Color3.fromRGB(24, 217, 255)
	spawn.Material = Enum.Material.Neon
	spawn.Parent = folder
	revealPart(spawn, 0.2)
	createStartTitleArch(folder, obbyTitle, Vector3.new(-5, 4, 0), colors)

	local desiredJumpGap = maxSafeJumpGap(difficulty) * 0.92
	local laneWidth = difficulty == "Hard" and 10 or difficulty == "Medium" and 8 or 6
	local platformSize = difficulty == "Hard" and Vector3.new(11, 1.5, 8) or difficulty == "Medium" and Vector3.new(13, 1.5, 9) or Vector3.new(15, 1.5, 10)
	local lastCheckpointX = 0
	local previousPosition = spawn.Position
	local previousSize = spawn.Size
	local rewardIndex = 0

	for sectionIndex = 1, sectionCount do
		local obstacle = obstacles[((sectionIndex - 1) % #obstacles) + 1]
		local platformCount = difficulty == "Hard" and 5 or difficulty == "Medium" and 4 or 3
		local sectionStartX = previousPosition.X
		announceBuildPhase("Forging zone " .. sectionIndex .. ": " .. (zoneNames[((sectionIndex - 1) % #zoneNames) + 1]) .. "...", 0.18)

		for platformIndex = 1, platformCount do
			local z = ((platformIndex + sectionIndex) % 2 == 0) and laneWidth or -laneWidth
			if sectionIndex == 1 and platformIndex == 1 then
				z = 0
			end
			local y = 5 + math.min(sectionIndex, 5) * 0.25
			local position = nextPlatformPosition(previousPosition, previousSize, platformSize, desiredJumpGap, z, difficulty)
			position = Vector3.new(position.X, y, position.Z)
			local platformPart = createPart(folder, "Section_" .. sectionIndex .. "_Platform_" .. platformIndex, platformSize, position, colors.platform, Enum.Material.SmoothPlastic)
			revealPart(platformPart, sectionIndex * 0.08 + platformIndex * 0.04)
			createForgePulse(folder, "ForgePulse_" .. sectionIndex .. "_" .. platformIndex, position + Vector3.new(0, 1, 0), colors.accent, sectionIndex * 0.08 + platformIndex * 0.04)
			createBlueprintLine(folder, "BlueprintPath_" .. sectionIndex .. "_" .. platformIndex, previousPosition, position, colors.accent)
			if platformIndex % 2 == 1 then
				rewardIndex += 1
				createRewardCoin(folder, rewardIndex, position, colors)
			end

			if obstacle == "Moving platforms" and platformIndex % 2 == 0 then
				platformPart.Name = platformPart.Name .. "_Moving"
				platformPart.Color = colors.accent
				platformPart:SetAttribute("OPREALM_Moving", true)
				platformPart:SetAttribute("OPREALM_MoveDistance", 18)
			end

			previousPosition = position
			previousSize = platformSize
		end

		local sectionCenter = Vector3.new((sectionStartX + previousPosition.X) * 0.5, 4, 0)
		local hazard = createHazard(folder, obstacle, sectionCenter, theme)
		revealPart(hazard, sectionIndex * 0.1)
		addThemeDecor(folder, theme, sectionCenter, sectionIndex)
		if sectionIndex == 1 or sectionIndex == math.ceil(sectionCount / 2) or sectionIndex == sectionCount then
			createZoneGate(folder, zoneNames[((sectionIndex - 1) % #zoneNames) + 1], sectionCenter + Vector3.new(0, 2, 0), colors, 0)
		end

		local checkpointSize = Vector3.new(10, 1, 10)
		local checkpointPosition = nextPlatformPosition(previousPosition, previousSize, checkpointSize, desiredJumpGap, 0, difficulty)
		checkpointPosition = Vector3.new(checkpointPosition.X, 5, checkpointPosition.Z)
		lastCheckpointX = checkpointPosition.X
		local checkpoint = createCheckpoint(folder, sectionIndex, checkpointPosition)
		revealPart(checkpoint, sectionIndex * 0.12)
		createForgePulse(folder, "CheckpointForgePulse_" .. sectionIndex, checkpointPosition + Vector3.new(0, 1, 0), Color3.fromRGB(49, 214, 139), sectionIndex * 0.12)
		previousPosition = checkpointPosition
		previousSize = checkpointSize
	end

	announceBuildPhase("Powering final portal and reward moment...", 0.25)
	local finishSize = Vector3.new(22, 2, 22)
	local finishPosition = nextPlatformPosition(previousPosition, previousSize, finishSize, desiredJumpGap, 0, difficulty)
	local finishX = math.max(lastCheckpointX + 10, finishPosition.X)
	local finish = createPart(folder, "FinishPad", finishSize, Vector3.new(finishX, 6, finishPosition.Z), Color3.fromRGB(49, 214, 139), Enum.Material.Neon)
	revealPart(finish, 0.1)
	createPortal(folder, Vector3.new(finishX + 8, 5.2, finishPosition.Z), colors)
	createLabel(folder, "FINISH", Vector3.new(finishX, 16, -12))

	announceBuildPhase("Launching cinematic OPRealm flythrough...", 0.2)
	createCinematicFlythrough(sectionCount, Vector3.new(finishX, 6, finishPosition.Z))
	Selection:Set({ folder, finish })
	setStatus("Built " .. theme .. " " .. difficulty .. " obby with " .. sectionCount .. " sections. Press Play to test it.")
end

button.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

buildButton.MouseButton1Click:Connect(function()
	local ok, result = pcall(function()
		local payload = decodePayload()
		buildObby(payload)
	end)

	if not ok then
		setStatus(tostring(result))
	end
end)

clearButton.MouseButton1Click:Connect(function()
	local existing = Workspace:FindFirstChild("OPREALM_Generated_Obby")
	if existing then
		existing:Destroy()
		setStatus("Cleared previous OPREALM obby.")
	else
		setStatus("No OPREALM obby to clear.")
	end
end)
