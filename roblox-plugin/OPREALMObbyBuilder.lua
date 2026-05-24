-- OPREALM Obby Builder v1
-- Install by copying this file to:
-- %LOCALAPPDATA%\Roblox\Plugins\OPREALMObbyBuilder.lua

local HttpService = game:GetService("HttpService")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")

local toolbar = plugin:CreateToolbar("OPREALM")
local button = toolbar:CreateButton("Obby Builder", "Open OPREALM Obby Builder", "")

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	true,
	false,
	440,
	560,
	340,
	440
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

local box = Instance.new("TextBox")
box.Size = UDim2.new(1, 0, 0, 270)
box.Position = UDim2.fromOffset(0, 54)
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

local buildButton = Instance.new("TextButton")
buildButton.Size = UDim2.new(1, 0, 0, 48)
buildButton.Position = UDim2.fromOffset(0, 340)
buildButton.BackgroundColor3 = Color3.fromRGB(24, 217, 255)
buildButton.TextColor3 = Color3.fromRGB(7, 16, 58)
buildButton.Text = "Build Obby"
buildButton.Font = Enum.Font.GothamBold
buildButton.TextSize = 18
buildButton.Parent = root

local clearButton = Instance.new("TextButton")
clearButton.Size = UDim2.new(1, 0, 0, 42)
clearButton.Position = UDim2.fromOffset(0, 398)
clearButton.BackgroundColor3 = Color3.fromRGB(55, 70, 112)
clearButton.TextColor3 = Color3.fromRGB(255, 255, 255)
clearButton.Text = "Clear Previous OPREALM Obby"
clearButton.Font = Enum.Font.GothamBold
clearButton.TextSize = 15
clearButton.Parent = root

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, 0, 0, 82)
status.Position = UDim2.fromOffset(0, 456)
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
	panel.AnchorPoint = Vector2.new(0, 0)
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
	return character:FindFirstChildWhichIsA("Humanoid")
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

for _, item in ipairs(folder:GetDescendants()) do
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
				Color3.fromRGB(49, 214, 139)
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

local function createLedSign(parent, text, position, yaw)
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
	-- Roblox default Humanoid values are WalkSpeed 16 and JumpPower 50.
	-- Air time at normal gravity is roughly 2 * 50 / 196.2 = 0.51s, so flat
	-- travel is about 8.15 studs before animation/controller variance.
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
	else
		Lighting.ClockTime = 18
		Lighting.Brightness = 1.7
		Lighting.Ambient = Color3.fromRGB(120, 72, 48)
		Lighting.OutdoorAmbient = Color3.fromRGB(72, 44, 44)
	end
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
		createPart(parent, "LollipopStick_" .. index, Vector3.new(1, 16, 1), position + Vector3.new(-12, 8, -8), Color3.fromRGB(255, 255, 255), Enum.Material.SmoothPlastic)
		local ball = createPart(parent, "LollipopTop_" .. index, Vector3.new(8, 8, 2), position + Vector3.new(-12, 18, -8), colors.hazard, Enum.Material.Neon)
		ball.Shape = Enum.PartType.Ball
	elseif theme == "Space" then
		local asteroid = makeKillZone(createPart(parent, "FlyingMeteor_" .. index, Vector3.new(7, 7, 7), position + Vector3.new(28, 22, -10), Color3.fromRGB(90, 92, 108), Enum.Material.Slate))
		asteroid.Shape = Enum.PartType.Ball
		asteroid:SetAttribute("OPREALM_FlyingHazard", true)
		asteroid:SetAttribute("OPREALM_FlyDistance", 68)
	elseif theme == "Jungle" then
		createPart(parent, "Vine_" .. index, Vector3.new(1, 18, 1), position + Vector3.new(-12, 9, -8), colors.accent, Enum.Material.Grass)
	elseif theme == "Cyber" then
		createPart(parent, "NeonPillar_" .. index, Vector3.new(2, 18, 2), position + Vector3.new(-12, 9, -8), colors.hazard, Enum.Material.Neon)
	else
		createPart(parent, "VolcanoRock_" .. index, Vector3.new(7, 7, 7), position + Vector3.new(-12, 3.5, -8), colors.base, Enum.Material.Slate)
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
	local colors = THEME_COLORS[theme] or THEME_COLORS.Volcano
	local sectionCount = tonumber(plan.sectionCount) or 4
	local obstacles = plan.obstacles or { "Moving platforms", "Lava jumps", "Disappearing platforms" }

	local folder = getOrCreateFolder()
	applyThemeEnvironment(theme)

	addRuntimeScript(folder)
	createPart(folder, "ObsidianUnderplate", Vector3.new(sectionCount * 72 + 90, 2, 70), Vector3.new(sectionCount * 36, -5, 0), colors.base, Enum.Material.Slate)
	local lava = makeKillZone(createPart(folder, "FloorIsLava_KillZone", Vector3.new(sectionCount * 72 + 120, 1, 78), Vector3.new(sectionCount * 36, 0.5, 0), colors.hazard, Enum.Material.Neon))
	lava.Transparency = 0.08
	createPart(folder, "ThemeBackdrop_Left", Vector3.new(sectionCount * 72 + 80, 24, 2), Vector3.new(sectionCount * 36, 10, -40), colors.base, Enum.Material.SmoothPlastic).Transparency = 0.25
	createPart(folder, "ThemeBackdrop_Right", Vector3.new(sectionCount * 72 + 80, 24, 2), Vector3.new(sectionCount * 36, 10, 40), colors.base, Enum.Material.SmoothPlastic).Transparency = 0.25
	createLedSign(folder, "OPREALM\nANIMATION", Vector3.new(36, 20, -41), 0)
	createLedSign(folder, "OPREALM\nANIMATION", Vector3.new(math.max(82, sectionCount * 72 - 10), 20, 41), 180)
	createPart(folder, "SpawnPad", Vector3.new(18, 1.5, 18), Vector3.new(0, 4, 0), Color3.fromRGB(24, 217, 255), Enum.Material.Neon)
	createLabel(folder, "OPREALM " .. theme .. " Obby", Vector3.new(0, 14, -12))

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "OPREALM_Spawn"
	spawn.Size = Vector3.new(10, 1, 10)
	spawn.Position = Vector3.new(0, 5, 0)
	spawn.Anchored = true
	spawn.Color = Color3.fromRGB(24, 217, 255)
	spawn.Material = Enum.Material.Neon
	spawn.Parent = folder

	local desiredJumpGap = maxSafeJumpGap(difficulty) * 0.92
	local laneWidth = difficulty == "Hard" and 10 or difficulty == "Medium" and 8 or 6
	local platformSize = difficulty == "Hard" and Vector3.new(11, 1.5, 8) or difficulty == "Medium" and Vector3.new(13, 1.5, 9) or Vector3.new(15, 1.5, 10)
	local lastCheckpointX = 0
	local previousPosition = spawn.Position
	local previousSize = spawn.Size

	for sectionIndex = 1, sectionCount do
		local obstacle = obstacles[((sectionIndex - 1) % #obstacles) + 1]
		local platformCount = difficulty == "Hard" and 5 or difficulty == "Medium" and 4 or 3
		local sectionStartX = previousPosition.X

		for platformIndex = 1, platformCount do
			local z = ((platformIndex + sectionIndex) % 2 == 0) and laneWidth or -laneWidth
			if sectionIndex == 1 and platformIndex == 1 then
				z = 0
			end
			local y = 5 + math.min(sectionIndex, 5) * 0.25
			local position = nextPlatformPosition(previousPosition, previousSize, platformSize, desiredJumpGap, z, difficulty)
			position = Vector3.new(position.X, y, position.Z)
			local platform = createPart(folder, "Section_" .. sectionIndex .. "_Platform_" .. platformIndex, platformSize, position, colors.platform, Enum.Material.SmoothPlastic)

			if obstacle == "Moving platforms" and platformIndex % 2 == 0 then
				platform.Name = platform.Name .. "_Moving"
				platform.Color = colors.accent
				platform:SetAttribute("OPREALM_Moving", true)
				platform:SetAttribute("OPREALM_MoveDistance", 18)
			end

			previousPosition = position
			previousSize = platformSize
		end

		local sectionCenter = Vector3.new((sectionStartX + previousPosition.X) * 0.5, 4, 0)
		createHazard(folder, obstacle, sectionCenter, theme)
		addThemeDecor(folder, theme, sectionCenter, sectionIndex)

		local checkpointSize = Vector3.new(10, 1, 10)
		local checkpointPosition = nextPlatformPosition(previousPosition, previousSize, checkpointSize, desiredJumpGap, 0, difficulty)
		checkpointPosition = Vector3.new(checkpointPosition.X, 5, checkpointPosition.Z)
		lastCheckpointX = checkpointPosition.X
		createCheckpoint(folder, sectionIndex, checkpointPosition)
		previousPosition = checkpointPosition
		previousSize = checkpointSize
	end

	local finishSize = Vector3.new(22, 2, 22)
	local finishPosition = nextPlatformPosition(previousPosition, previousSize, finishSize, desiredJumpGap, 0, difficulty)
	local finishX = math.max(lastCheckpointX + 10, finishPosition.X)
	createPart(folder, "FinishPad", finishSize, Vector3.new(finishX, 6, finishPosition.Z), Color3.fromRGB(49, 214, 139), Enum.Material.Neon)
	createLabel(folder, "FINISH", Vector3.new(finishX, 16, -12))

	Workspace.CurrentCamera.CFrame = CFrame.new(Vector3.new(sectionCount * 38, 95, 120), Vector3.new(sectionCount * 38, 4, 0))
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
